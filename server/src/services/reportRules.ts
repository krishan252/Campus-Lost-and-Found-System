import { ApiError } from '../lib/errors.js';
export function assertCanModerate(status:string) {
  if (status !== 'PENDING_REVIEW') throw new ApiError(409,'Only pending reports can be reviewed.');
}
export function assertCanEdit(status:string) {
  if (status !== 'REJECTED') throw new ApiError(409,'Only rejected reports can be edited and resubmitted.');
}
export function validateImageSignature(buf:Buffer): {ext:string; mime:string}|null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return {ext:'jpg',mime:'image/jpeg'};
  if (buf.length >= 8 && buf.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return {ext:'png',mime:'image/png'};
  if (buf.length >= 12 && buf.toString('ascii',0,4)==='RIFF' && buf.toString('ascii',8,12)==='WEBP') return {ext:'webp',mime:'image/webp'};
  return null;
}
