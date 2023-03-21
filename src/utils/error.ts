export class HttpError extends Error {
  constructor(public status: number, public message: string) {
    super(message);
  }
}
export class NotFoundError extends HttpError {
  constructor(public message: string) {
    super(404, message);
  }
}

export class BadRequestError extends HttpError {
  constructor(public message: string) {
    super(400, message);
  }
}

export class NotAllowedError extends HttpError {
  constructor(public message: string) {
    super(403, message);
  }
}
