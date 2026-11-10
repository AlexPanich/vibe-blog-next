import { authorRequestLinkLabel } from "@/domains/users/shared/authorRequestLink";

type AuthorRequestLinkProps = {
  link: string | null
}

// «Где почитать» в заявке (спека 48): одна строка, длинный адрес — многоточием, полный — в title
export default function AuthorRequestLink({ link }: AuthorRequestLinkProps) {
  if(!link){
    return null;
  }

  return (
    <p className="ui-request-link">
      <span className="ui-request-link__label">Где почитать:</span>
      <a href={link} target="_blank" rel="nofollow noopener ugc" title={link}>{ authorRequestLinkLabel(link) }</a>
    </p>
  );
}
