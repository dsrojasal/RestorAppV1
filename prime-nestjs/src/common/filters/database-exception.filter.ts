import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

type PostgresError = {
  code?: string;
  detail?: string;
  table?: string;
  column?: string;
  constraint?: string;
};

type MappedError = {
  status: number;
  error: string;
  message: string;
};

const UNIQUE_MESSAGES: Record<string, string> = {
  usuario: 'Ese correo ya está registrado. Usa otro correo.',
  user: 'Ese correo ya está registrado. Usa otro correo.',
  categoria: 'Ya existe una categoría con ese nombre.',
  ingrediente: 'Ya existe un ingrediente con ese nombre.',
  mesa: 'Ya existe una mesa con ese número.',
  rol: 'Ya existe un rol con ese nombre.',
  tipo_pago: 'Ya existe un método de pago con ese nombre.',
  producto_ingrediente: 'Ese ingrediente ya está asignado a la receta de este plato.',
  factura: 'Ese pedido ya tiene una factura registrada.',
  turno: 'Ya hay una caja abierta. Ciérrala antes de abrir otra.',
  turno_usuario: 'Ese usuario ya está asignado a este turno con ese rol.',
};

@Catch()
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('DatabaseExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Las excepciones de Nest (validación, 404, 401, conflictos ya traducidos)
    // se responden tal cual, sin alterar su contenido.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload = typeof body === 'string' ? { statusCode: status, message: body } : body;
      response.status(status).json(payload);
      return;
    }

    if (exception instanceof QueryFailedError) {
      const driverError = (exception as QueryFailedError & { driverError?: PostgresError }).driverError ?? (exception as unknown as PostgresError);
      const mapped = this.mapDatabaseError(driverError, request.method);

      if (mapped) {
        this.logger.warn(
          `[${request.method} ${request.url}] ${driverError.code ?? 'DB'} ` +
            `${driverError.table ? `tabla=${driverError.table} ` : ''}` +
            `${driverError.constraint ? `constraint=${driverError.constraint}` : ''}`.trim(),
        );
        response.status(mapped.status).json({
          statusCode: mapped.status,
          message: mapped.message,
          error: mapped.error,
        });
        return;
      }
    }

    // Cualquier otro error inesperado: se registra completo en el servidor
    // y al usuario se le muestra un mensaje comprensible.
    this.logger.error(`[${request.method} ${request.url}] Error no controlado`, exception instanceof Error ? exception.stack : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'No se pudo completar la operación. Intenta de nuevo.',
      error: 'Internal Server Error',
    });
  }

  private mapDatabaseError(error: PostgresError, method: string): MappedError | null {
    switch (error.code) {
      case '23505': {
        const message = UNIQUE_MESSAGES[error.table ?? ''] ?? 'Ya existe un registro con esos datos. Revisa los campos e intenta de nuevo.';
        return { status: HttpStatus.CONFLICT, error: 'Conflict', message };
      }
      case '23503': {
        const message =
          method === 'DELETE'
            ? 'No se puede eliminar porque tiene información asociada en el sistema.'
            : 'Uno de los datos seleccionados ya no existe. Actualiza la página e intenta de nuevo.';
        return { status: HttpStatus.CONFLICT, error: 'Conflict', message };
      }
      case '23502': {
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Falta un dato obligatorio. Revisa el formulario e intenta de nuevo.',
        };
      }
      case '22P02': {
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Uno de los datos enviados no es válido. Revisa el formulario.',
        };
      }
      case '22003': {
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'El monto o la cantidad ingresada es demasiado grande.',
        };
      }
      case '22001': {
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Uno de los textos es demasiado largo. Acórtalo e intenta de nuevo.',
        };
      }
      case '23514': {
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'Los datos no cumplen una regla del sistema. Revisa los valores.',
        };
      }
      default:
        return null;
    }
  }
}
