export type User = {id:string;fullName:string;email:string;role:'USER'|'ADMIN'};
export type Picklist = {id:number;name:string};
export type ImageRecord = {id:string;mimeType:string;sizeBytes:number};
export type Report = {
  id:string;title:string;publicDescription:string;reportType:'LOST'|'FOUND';status:'PENDING_REVIEW'|'APPROVED'|'REJECTED'|'CLOSED';
  eventDate:string;createdAt:string;categoryId:number;locationId:number;
  category:Picklist;location:Picklist;lastReviewReason?:string|null;
  reporterId:string;reporter?:{id:string;fullName:string;email:string};
  images:ImageRecord[];
  privateDetails?:{secretAttributes:string|null;storageLocation:string|null;finderContact:string|null}|null;
};
export type ReportInput = {reportType:'LOST'|'FOUND';title:string;publicDescription:string;categoryId:number;locationId:number;eventDate:string;secretAttributes:string;storageLocation:string;finderContact:string};
type ApiResponse<T> = {success:boolean;message?:string;data:T;details?:{issues?:Array<{path:(string|number)[];message:string}>}};
const base = '/api/v1';
export async function request<T>(path:string, init:RequestInit={}):Promise<T> {
  const isForm = init.body instanceof FormData;
  const response = await fetch(base+path,{
    credentials:'include',...init,headers:{...(isForm?{}:{'Content-Type':'application/json'}),...init.headers}
  });
  let parsed:ApiResponse<T>;
  try {parsed = await response.json() as ApiResponse<T>;} catch {throw new Error('Server response was not valid JSON.');}
  if(!response.ok) {
    const issue = parsed.details?.issues?.[0];
    throw new Error(issue ? `${issue.path.join('.') || 'Form'}: ${issue.message}` : parsed.message || 'Request failed.');
  }
  return parsed.data;
}
export async function messageRequest(path:string,init:RequestInit={}) {
  const response = await fetch(base+path,{
    credentials:'include',...init,headers:{'Content-Type':'application/json',...init.headers}
  });
  const parsed = await response.json() as {success:boolean;message:string};
  if(!response.ok) throw new Error(parsed.message||'Request failed.');
  return parsed.message;
}
export function apiImage(reportId:string,imageId:string) {return `${base}/reports/${reportId}/images/${imageId}`;}
