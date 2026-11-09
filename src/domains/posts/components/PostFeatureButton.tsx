'use client'

import 'client-only';
import UserGate from "@/components/general/UserGate";
import { showToast } from "@/components/general/showToast";
import { featurePostAction, unfeaturePostAction } from "@/domains/posts/actions/postModerationActions";
import { featurePost } from "@/domains/posts/policy";
import { Button } from "@mantine/core";
import { IconAlertCircle, IconAward, IconAwardOff } from "@tabler/icons-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";

type PostFeatureButtonProps = {
  id: number,
  // Выбран ли пост сейчас — публичный факт (он виден на главной), поэтому примитив пропом
  featured: boolean,
  // meta — пункт ряда над заголовком поста, row — кнопка в строке списка, panel — кнопка блока решения
  variant: 'meta' | 'row' | 'panel'
}

/*
  «Выбрать для главной» / «Снять с главной» (спека 39). Видна только тем, кому можно выбирать;
  права всё равно проверяют actions. Устаревшая страница получает 409 — тостом
*/
export default function PostFeatureButton(props: PostFeatureButtonProps) {
  return <UserGate auth={user => featurePost(user) && <FeatureButton {...props} />} />;
}

function FeatureButton({ id, featured, variant }: PostFeatureButtonProps) {
  const router = useRouter();
  const handlers = {
    onSuccess: () => router.refresh(),
    onError: ({ error }: { error: { serverError?: { message: string } } }) => {
      showToast({
        id: `post-feature-${id}`,
        icon: <IconAlertCircle size={18} />,
        title: 'Не получилось',
        text: error.serverError?.message ?? 'Попробуйте ещё раз',
        href: null
      });
    }
  };
  const pick = useAction(featurePostAction.bind(null, id), handlers);
  const unpick = useAction(unfeaturePostAction.bind(null, id), handlers);
  const pending = pick.isPending || unpick.isPending;
  const Icon = featured ? IconAwardOff : IconAward;
  const label = featured ? 'Снять с главной' : 'Выбрать для главной';

  function toggle(){
    if(featured){
      unpick.execute();
    }
    else{
      pick.execute();
    }
  }

  if(variant === 'panel'){
    return <Button variant="default" leftSection={<Icon size={16} stroke={1.8} />} loading={pending} onClick={toggle}>
      { label }
    </Button>;
  }

  const className = variant === 'meta' ? 'ui-post__feature' : 'ui-post-row__edit ui-post-row__feature';

  return <button type="button" className={className} disabled={pending} onClick={toggle}>
    <Icon size={14} stroke={1.8} />{ label }
  </button>;
}
