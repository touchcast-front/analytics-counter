export class ValidationError extends Error {
  type = 'validation'

  constructor(message: string, received: any) {
    super(
      `[Validation] ${message} (${`Received: ${JSON.stringify(received)})`}`
    )
  }
}
