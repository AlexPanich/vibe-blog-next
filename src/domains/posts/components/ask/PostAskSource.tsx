'use client'

import 'client-only';
import Link from "@/components/general/Link";
import { imageUrl } from "@/core/imageUrl";
import type { PostAskSourceResource } from "@/domains/posts/dto/postAskResources";
import { IconPhoto } from "@tabler/icons-react";

type PostAskSourceProps = {
  source: PostAskSourceResource
}

// Компактная карточка источника: номер сноски, обложка 64×64, заголовок и автор (спека 57, п. 9)
export default function PostAskSource({ source }: PostAskSourceProps) {
  return (
    <Link href={`/posts/${source.id}`} className="ui-ask-source">
      <span className="ui-ask-source__n">[{ source.n }]</span>
      { source.cover
        ? <img className="ui-ask-source__cover" src={imageUrl(source.cover.fileKey, 400)} alt="" width={64} height={64} loading="lazy" />
        : <span className="ui-ask-source__cover ui-ask-source__cover--empty" aria-hidden><IconPhoto size={20} stroke={1.6} /></span> }
      <span className="ui-ask-source__body">
        <span className="ui-ask-source__title">{ source.title }</span>
        <span className="ui-ask-source__author">{ source.authorName }</span>
      </span>
    </Link>
  );
}
