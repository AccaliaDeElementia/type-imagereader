'use sanity'

import type { Request, Response, RequestHandler } from 'express'
import type { Debugger } from 'debug'
import { StatusCodes } from 'http-status-codes'

export function handleErrors(
  logger: Debugger,
  action: (req: Request, res: Response) => Promise<void> | void,
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      await action(req, res)
    } catch (e) {
      logger(`Error rendering: ${req.originalUrl}`, req.body)
      logger(e)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      })
    }
  }
}

export interface ErrorPayload {
  code: string
  statusCode: StatusCodes
  message: string
  path?: string
}

export function sendError(res: Response, error: ErrorPayload): void {
  const { code, statusCode, message, path } = error
  res.status(statusCode).json({
    error: { code, message, ...(path === undefined ? {} : { path }) },
  })
}
