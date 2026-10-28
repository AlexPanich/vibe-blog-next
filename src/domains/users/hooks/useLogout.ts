import 'client-only';
import { signOut } from "@/globals/authClient";
import useSetUser from "@/hooks/useSetUser";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Выход и уход на форму входа: кнопка в профиле и пункт меню в шапке
export default function useLogout(){
  const [ pending, setPending ] = useState(false);
  const router = useRouter();
  const setUser = useSetUser();

  async function logout(){
    if(pending){
      return;
    }

    setPending(true);

    try{
      const result = await signOut();

      if(result.data?.success){
        // Без сброса публичная часть осталась бы «вошедшей»: /auth в том же root layout
        setUser(null);
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
