export function formatPhone(phone: string): string {
    if (!phone) return '';

    // Sadece rakamları tutalım
    const cleaned = ('' + phone).replace(/\D/g, '');

    // Telefon numarası "+90" ile başlıyorsa (12 haneli) veya 0 ile başlıyorsa (11 haneli), başındaki +90 veya 0'ı atalım
    let match = cleaned.match(/^90(\d{3})(\d{3})(\d{2})(\d{2})$/);
    if (!match && cleaned.length === 11 && cleaned.startsWith('0')) {
        match = cleaned.match(/^0(\d{3})(\d{3})(\d{2})(\d{2})$/);
    }
    // Sadece 10 haneli girilmişse
    if (!match && cleaned.length === 10) {
        match = cleaned.match(/^(\d{3})(\d{3})(\d{2})(\d{2})$/);
    }

    if (match) {
        return `(${match[1]}) ${match[2]} ${match[3]} ${match[4]}`;
    }

    return phone;
}

export function formatPhoneInput(value: string): string {
    if (!value) return value;

    // Sadece rakamları bırak
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;

    // Uzunluğa göre formatla
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    if (phoneNumberLength < 9) {
        return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)} ${phoneNumber.slice(6)}`;
    }

    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)} ${phoneNumber.slice(6, 8)} ${phoneNumber.slice(8, 10)}`;
}

export function stripPhone(formatted: string): string {
    // Rakamları bırakıp +90 ekliyoruz
    const digits = formatted.replace(/\D/g, '');
    if (digits.length === 10) {
        return `+90${digits}`;
    }
    if (digits.length === 11 && digits.startsWith('0')) {
        return `+90${digits.substring(1)}`;
    }
    return `+${digits}`; // Eğer başka bir formatta rakam geldiyse, direkt başına + koyuyoruz 
}

export function maskTC(tcKimlik: string | null | undefined): string {
    if (!tcKimlik || tcKimlik.length !== 11) return tcKimlik || '';
    return `${tcKimlik.substring(0, 3)}****${tcKimlik.substring(7)}`;
}
