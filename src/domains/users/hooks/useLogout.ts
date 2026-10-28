import 'client-only';
import { signOut } from "@/globals/authClient";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Выход и уход на форму входа: кнопка в профиле и пункт меню в шапке
export default function useLogout(){
  const [ pending, setPending ] = useState(false);
  const router = useRouter();

  async function logout(){
    if(pending){
      return;
    }

    setPending(true);

    try{
      const result = await signOut();

      if(result.data?.success){
        router.push('/auth/login');
      }
    }
    catch(e){
      console.log(e)
      // show error to client
    }
    finally{
      setPending(false);
    }
  }

  return { logout, pending };
}
