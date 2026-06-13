import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as webpush from 'web-push';

export interface PushPayload {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    badge?: string;
    tag?: string;
}

export type NotificationEventType =
    | 'escalatedMessages'
    | 'appointmentCreated'
    | 'appointmentCancelled'
    | 'appointmentUpdated';

@Injectable()
export class PushService implements OnModuleInit {
    private readonly logger = new Logger(PushService.name);

    constructor(private readonly prisma: PrismaService) {}

    onModuleInit() {
        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        const subject = process.env.VAPID_SUBJECT || 'mailto:admin@klinikapp.com';

        if (!publicKey || !privateKey) {
            this.logger.warn('VAPID keys not configured — push notifications disabled');
            return;
        }

        webpush.setVapidDetails(subject, publicKey, privateKey);
        this.logger.log('Web Push initialized with VAPID keys');
    }

    getVapidPublicKey(): string {
        return process.env.VAPID_PUBLIC_KEY || '';
    }

    /** Cihaz subscription'ını kaydet veya güncelle */
    async subscribe(userId: string, clinicId: string, subscription: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
    }) {
        return this.prisma.pushSubscription.upsert({
            where: { endpoint: subscription.endpoint },
            update: { userId, clinicId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
            create: {
                userId,
                clinicId,
                endpoint: subscription.endpoint,
                p256dh: subscription.keys.p256dh,
                auth: subscription.keys.auth,
            },
        });
    }

    /** Cihaz subscription'ını kaldır */
    async unsubscribe(endpoint: string) {
        await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
    }

    /** Kullanıcının tüm cihazlarına bildirim gönder */
    async sendToUser(userId: string, payload: PushPayload) {
        const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
        await this._dispatch(subs, payload);
    }

    /**
     * Kliniğin kullanıcılarına bildirim gönder — eventType'a göre preference filtreli
     * @param targetUserIds boşsa tüm klinik personeli
     */
    async sendToClinic(
        clinicId: string,
        eventType: NotificationEventType,
        payload: PushPayload,
        targetUserIds?: string[],
    ) {
        // Preference'a göre filtrele
        const prefs = await this.prisma.notificationPreference.findMany({
            where: {
                clinicId,
                ...(targetUserIds ? { userId: { in: targetUserIds } } : {}),
                [eventType]: true,
            },
            select: { userId: true },
        });

        const userIdsWithPref = new Set(prefs.map(p => p.userId));

        // Preference kaydı olmayanlar default TRUE kabul edilir
        const allUsersQuery = await this.prisma.user.findMany({
            where: {
                clinicId,
                isActive: true,
                ...(targetUserIds ? { id: { in: targetUserIds } } : {}),
            },
            select: { id: true },
        });

        const eligibleUserIds = allUsersQuery
            .map(u => u.id)
            .filter(id => {
                const hasPref = prefs.some(p => p.userId === id);
                if (!hasPref) return true; // Default açık
                return userIdsWithPref.has(id);
            });

        if (eligibleUserIds.length === 0) return;

        const subs = await this.prisma.pushSubscription.findMany({
            where: { userId: { in: eligibleUserIds }, clinicId },
        });

        await this._dispatch(subs, payload);
    }

    /** Rol bazlı gönderim */
    async sendToRoles(
        clinicId: string,
        roles: string[],
        eventType: NotificationEventType,
        payload: PushPayload,
    ) {
        const users = await this.prisma.user.findMany({
            where: { clinicId, role: { in: roles as any[] }, isActive: true },
            select: { id: true },
        });
        await this.sendToClinic(clinicId, eventType, payload, users.map(u => u.id));
    }

    private async _dispatch(
        subs: { endpoint: string; p256dh: string; auth: string }[],
        payload: PushPayload,
    ) {
        const body = JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || '/mobile',
            icon: payload.icon || '/icon-192.png',
            badge: payload.badge || '/badge-72.png',
            tag: payload.tag,
        });

        const results = await Promise.allSettled(
            subs.map(sub =>
                webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    body,
                    { TTL: 86400 },
                ).catch((err: any) => {
                    // 410 Gone = expired subscription → sil
                    if (err.statusCode === 410) {
                        this.prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } }).catch(() => {});
                    }
                    throw err;
                }),
            ),
        );

        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed > 0) this.logger.warn(`Push: ${failed}/${subs.length} failed`);
    }
}
