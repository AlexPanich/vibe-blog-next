import 'server-only';
import { getAuthUser } from "@/shared/auth";
import { AuthUser } from "@/shared/authUser";
import { forbidden, unauthorized } from "next/navigation";

export type PolicyFn = (auth: AuthUser) => Promise<boolean> | boolean;

export default class BoucerService{
  constructor(){}

  async breakIfCant(policyFn: PolicyFn){
    const user = await getAuthUser();

    if(!user){
      return unauthorized(); // forbidden
    }

    if(!(await policyFn(user))){
      return forbidden();
    }
  }
}