import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Beklenmeyen bir hata oluştu';
        let errors: any = undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exResponse = exception.getResponse();

            if (typeof exResponse === 'string') {
                message = exResponse;
            } else if (typeof exResponse === 'object') {
                const res = exResponse as any;
                message = res.message || message;
                errors = res.errors;
            }
        }

        // Log server errors
        if (status >= 500) {
            console.error('Server Error:', exception);
        }

        response.status(status).json({
            success: false,
            statusCode: status,
            message: Array.isArray(message) ? message : [message],
            errors,
            timestamp: new Date().toISOString(),
        });
    }
}
