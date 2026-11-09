'use client'

import 'client-only';
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { updateBioAction, updateNameAction } from "@/domains/users/actions/userAccountActions";
import { USER_NAME_MAX } from "@/domains/users/dto/authRequests";
import { UserNameStateResource } from "@/domains/users/dto/userResources";
import { normalizeName } from "@/domains/users/shared/nameChange";
import { StrictResource } from "@/core/resource";
import { fieldError } from "@/components/general/FieldError";
import LocalDate from "@/components/general/LocalDate";
import useForm from "@/hooks/useForm";
import type { UserGender } from "@/database/schema";
import { Alert, Button, InputWrapper, Stack, Textarea, TextInput } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

type UserBioFormProps<T extends UserNameStateResource> = {
  nameState: StrictResource<T, UserNameStateResource>,
  bio: string,
  nameGenitive: string,
  gender: UserGender | null
}

/*
  «Публичная страница»: имя и «О себе» — видно на странице автора. Одна кнопка, два action
  (спека 45): bio уходит всегда, имя — только если изменилось, и ошибка частоты имени не мешает
  сохранить «О себе». Пока сутки со смены не прошли, имя readOnly с датой, когда снова можно.
  Имя в родительном падеже для «Ещё у …» под постом (спека 41) человек пишет сам — склонять
  не пытаемся. Род (спека 51) — только для глагола в уведомлениях, нигде не показывается
*/
export default function UserBioForm<T extends UserNameStateResource>({ nameState, bio, nameGenitive, gender }: UserBioFormProps<T>) {
  const router = useRouter();
  const { nv, update, data } = useForm({ name: nameState.name, bio, nameGenitive, gender: (gender ?? '') as GenderChoice });
  const bioAction = useAction(updateBioAction);
  // Новое имя — в шапке и useUser(): пользователь кабинета приходит из layout. По 429 — дата под полем
  const nameAction = useAction(updateNameAction, {
    onSuccess: ({ data }) => {
      update('name', data.name);

      if(data.changed){
        router.refresh();
      }
    },
    onError: ({ error }) => error.serverError?.code === 429 && router.refresh()
  });
  const locked = nameState.nextChangeAt;

  function submit(){
    bioAction.execute({ bio: data.bio, nameGenitive: data.nameGenitive, gender: data.gender || null });

    if(!locked && normalizeName(data.name) !== nameState.name){
      nameAction.execute({ name: data.name });
    }
    else{
      // Иначе «Новое имя видно везде» осталось бы от прошлого сохранения
      nameAction.reset();
    }
  }

  return (
    <form onSubmit={e => { e.preventDefault(); submit() }}>
      <Stack gap="md">
        <TextInput
          label="Имя"
          maxLength={USER_NAME_MAX}
          readOnly={!!locked}
          variant={locked ? 'filled' : 'default'}
          description={locked
            ? <>Менять можно раз в сутки — снова можно <LocalDate value={locked} /></>
            : 'Видно на странице автора, у постов и комментариев. Менять можно раз в сутки'}
          inputWrapperOrder={[ 'label', 'input', 'description', 'error' ]}
          {...nv('name')}
          // Заблокированное поле — имя с сервера: после 429 в форме осталось бы несохранённое
          value={locked ? nameState.name : data.name}
          onChange={e => update('name', e.target.value)}
          error={fieldError(nameAction.result.validationErrors, 'name') ?? nameAction.result.serverError?.message}
        />
        <TextInput
          label="Как вас называть в подписях: «Ещё у …»"
          placeholder="Ани, Марата Хасанова"
          description="Под вашими постами: «Ещё у Ани». Пусто — «Ещё у автора»"
          maxLength={40}
          inputWrapperOrder={[ 'label', 'input', 'description', 'error' ]}
          {...nv('nameGenitive')}
          onChange={e => update('nameGenitive', e.target.value)}
          error={fieldError(bioAction.result.validationErrors, 'nameGenitive')}
        />
        <InputWrapper label="Как писать о вас в уведомлениях" description="Только для уведомлений, нигде не показывается" inputWrapperOrder={[ 'label', 'input', 'description', 'error' ]}>
          <div className="ui-account-options" role="radiogroup" aria-label="Как писать о вас в уведомлениях">
            { GENDER_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                role="radio"
                className="ui-account-option"
                aria-checked={data.gender === option.value}
                onClick={() => update('gender', option.value)}
              >
                <span className="ui-account-option__radio" aria-hidden />
                <span className="ui-account-option__text">
                  <b>{ option.label }</b>
                  <small>{ option.text }</small>
                </span>
              </button>
            )) }
          </div>
        </InputWrapper>
        <Textarea
          label={<span className="ui-account-count">О себе <small>{ data.bio.length } / 500</small></span>}
          labelProps={{ className: 'ui-account-count__label' }}
          autosize
          minRows={3}
          {...nv('bio')}
          onChange={e => update('bio', e.target.value)}
          error={fieldError(bioAction.result.validationErrors, 'bio')}
        />
        { bioAction.result.data?.done && (
          <Alert color="green">
            { nameAction.result.data?.changed ? 'Сохранено. Новое имя видно везде.' : 'Сохранено — видно на вашей странице автора.' }
          </Alert>
        ) }
        <div className="ui-account__save">
          <Button type="submit" radius="xl" loading={bioAction.isPending || nameAction.isPending} leftSection={<IconCheck size={16} />}>Сохранить</Button>
        </div>
      </Stack>
    </form>
  );
}

const GENDER_OPTIONS: { value: GenderChoice, label: string, text: string }[] = [
  { value: 'm', label: 'Оценил', text: 'Подписался, написал вам' },
  { value: 'f', label: 'Оценила', text: 'Подписалась, написала вам' },
  { value: '', label: 'Не указывать', text: 'Без глагола: «новый подписчик»' },
];

type GenderChoice = UserGender | ''
