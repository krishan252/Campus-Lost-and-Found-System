import {createContext,useCallback,useContext,useEffect,useState,type ReactNode} from 'react';
import {request,type User} from '../api';
type Auth = {user:User|null;loading:boolean;refresh:()=>Promise<void>;logout:()=>Promise<void>};
const Ctx = createContext<Auth|null>(null);
export function AuthProvider({children}:{children:ReactNode}) {
  const [user,setUser] = useState<User|null>(null);
  const [loading,setLoading] = useState(true);
  const refresh = useCallback(async()=>{
    try {const data = await request<{user:User}>('/auth/me');setUser(data.user);}catch{setUser(null);}finally{setLoading(false);}
  },[]);
  useEffect(()=>{void refresh();},[refresh]);
  async function logout(){try{await request('/auth/logout',{method:'POST'});}finally{setUser(null);}}
  return <Ctx.Provider value={{user,loading,refresh,logout}}>{children}</Ctx.Provider>;
}
export function useAuth(){const v=useContext(Ctx);if(!v)throw new Error('AuthProvider missing');return v;}
