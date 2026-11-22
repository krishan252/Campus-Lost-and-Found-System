import { describe,it,expect } from 'vitest';
import { assertCanEdit,assertCanModerate,validateImageSignature } from '../src/services/reportRules.js';
describe('Sprint 1 lifecycle and images',()=>{
  it('only pending reports can be moderated',()=>{
    expect(()=>assertCanModerate('PENDING_REVIEW')).not.toThrow();
    expect(()=>assertCanModerate('APPROVED')).toThrow();
    expect(()=>assertCanModerate('REJECTED')).toThrow();
  });
  it('only rejected reports can be edited',()=>{
    expect(()=>assertCanEdit('REJECTED')).not.toThrow();
    expect(()=>assertCanEdit('PENDING_REVIEW')).toThrow();
  });
  it('rejects arbitrary uploaded file bytes',()=>{
    expect(validateImageSignature(Buffer.from('not a photo'))).toBeNull();
    expect(validateImageSignature(Buffer.from([137,80,78,71,13,10,26,10,0,0]))?.mime).toBe('image/png');
  });
});
