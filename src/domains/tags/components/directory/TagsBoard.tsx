'use client'

import 'client-only';
import type { StrictResource } from "@/core/resource";
import TagRestRow from "@/domains/tags/components/directory/TagRestRow";
import TagTile from "@/domains/tags/components/directory/TagTile";
import { myTagFollowIdsAction } from "@/domains/tags/actions/tagFollowActions";
import type { TagDirectoryResource } from "@/domains/tags/dto/tagResources";
import useUser from "@/hooks/useUser";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useRef, useState } from "react";

type TagsBoardProps<T extends TagDirectoryResource> = {
  directory: StrictResource<T, TagDirectoryResource>
}

/*
  Плитки и строки /tags (спека 31). Мои подписки — один запрос после гидрации, пока он идёт и
  гостю кнопок подписки нет: страница общая, сессию сервер не читает
*/
export default function TagsBoard<T extends TagDirectoryResource>({ directory }: TagsBoardProps<T>) {
  const { user, ready } = useUser();
  const [ following, setFollowing ] = useState<Set<number> | null>(null);
  const load = useAction(myTagFollowIdsAction, { onSuccess: ({ data }) => setFollowing(new Set(data.ids)) });
  const { execute: loadMine } = load;
  // execute меняется на каждом рендере — без метки эффект запрашивал бы по кругу
  const loadedFor = useRef<number | null>(null);

  useEffect(() => {
    if(ready && user && loadedFor.current !== user.id){
      loadedFor.current = user.id;
      setFollowing(null);
      loadMine();
    }
  }, [ ready, user, loadMine ]);

  const follows = ready && user ? following : null;

  function onChange(tagId: number, follow: boolean){
    setFollowing(prev => {
      const next = new Set(prev);

      if(follow){
        next.add(tagId);
      }
      else{
        next.delete(tagId);
      }

      return next;
    });
  }

  return (
    <>
      <section className="ui-tags-section">
        <div className="ui-tags-section__head">
          <h2 className="ui-tags-section__title">Больше всего постов</h2>
          <span className="ui-tags-section__note">по числу опубликованных</span>
        </div>
        <div className="ui-tags-tiles">
          { directory.top.map(tag => (
            <TagTile key={tag.id} tag={tag} following={follows ? follows.has(tag.id) : null} onChange={onChange} />
          )) }
        </div>
      </section>

      { directory.rest.length > 0 && <section className="ui-tags-section ui-tags-section--rest">
        <div className="ui-tags-section__head">
          <h2 className="ui-tags-section__title">Остальные рубрики</h2>
          <span className="ui-tags-section__note">по алфавиту</span>
        </div>
        <ul className="ui-tags-rest">
          { directory.rest.map(tag => (
            <TagRestRow key={tag.id} tag={tag} following={follows ? follows.has(tag.id) : null} onChange={onChange} />
          )) }
        </ul>
      </section> }
    </>
  );
}
