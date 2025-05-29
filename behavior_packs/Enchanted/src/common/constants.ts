export const ResponseCode = Object.freeze({
  SuccessCode: 0,
  NotFoundCode: 1,
  NotEnoughPermissionCode: 2,
  InvalidCredentialsCode: 3,
  InternalErrorCode: 4,
});
export const MessageInfo = Object.freeze({
  SizeLimit: 2048,
  MaxClientCapacity: 4095,
  ApproxUncompressedSize: 2048 * 1.3
})
