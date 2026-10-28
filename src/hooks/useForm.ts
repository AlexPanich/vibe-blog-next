import 'client-only';
import { useCallback, useState } from "react";

export default function useForm<
  FormSchema extends Record<string,unknown>
>(
  initial: FormSchema
){
  const [ data, setData ] = useState(initial);
  
  const update = useCallback(
    function<Name extends keyof FormSchema>(name: Name, value: FormSchema[Name]){
      setData(prev => ({ ...prev, [name]: value }))
    }, 
    []
  );

  function nv<Name extends keyof FormSchema>(name: Name){
    return {
      name: name,
      value: data[name]
    }
  }

 /*  function nvu<Name extends keyof FormSchema>(name: Name){
    return {
      name: name,
      value: form[name],
      onChange: (e: { target: { value: string } }) => update(name, e.target.value) // not all string
    }
  } */

  return { 
    data,
    nv,
    update
  };
}

export type AppForm<FormSchema extends Record<string,unknown>> =
  ReturnType<typeof useForm<FormSchema>>