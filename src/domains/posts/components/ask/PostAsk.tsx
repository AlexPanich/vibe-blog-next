'use client'

import 'client-only';
import type { StrictResource } from "@/core/resource";
import { postAskDto } from "@/domains/posts/dto/postAskRequests";
import { ASK_MAX } from "@/domains/posts/shared/postAsk";
import usePostAsk from "@/domains/posts/hooks/usePostAsk";
import PostAskAnswer from "@/domains/posts/components/ask/PostAskAnswer";
import { Button, Textarea } from "@mantine/core";
import { IconPlayerStopFilled, IconSparkles } from "@tabler/icons-react";
import { useState } from "react";

type PostAskProps = {
  examples: StrictResource<string[], string[]>
}

/*
  «Спросить блог» (спека 57, п. 2–4): поле вопроса, примеры-чипы до первого вопроса, ответ.
  Enter — спросить, Shift+Enter — перенос строки. Во время ответа кнопка — «Остановить»
*/
export default function PostAsk({ examples }: PostAskProps) {
  const [ question, setQuestion ] = useState('');
  const [ error, setError ] = useState<string | null>(null);
  const answer = usePostAsk();

  function submit(value = question){
    const parsed = postAskDto.safeParse({ question: value });

    if(!parsed.success){
      setError(parsed.error.issues[0]?.message ?? null);

      return;
    }

    setError(null);
    answer.ask(parsed.data.question);
  }

  function askExample(example: string){
    setQuestion(example);
    submit(example);
  }

  return (
    <>
      <section className="ui-panel ui-ask">
        <form onSubmit={e => { e.preventDefault(); submit() }}>
          <Textarea
            label="Ваш вопрос"
            placeholder="Например: где в Грузии можно пойти в поход на пару дней?"
            title="Enter — спросить, Shift+Enter — перенос строки"
            autosize
            minRows={2}
            maxRows={8}
            maxLength={ASK_MAX}
            description={`${question.length} / ${ASK_MAX}`}
            inputWrapperOrder={[ 'label', 'input', 'description', 'error' ]}
            value={question}
            onChange={e => {
              setQuestion(e.target.value);
              setError(null);
            }}
            onKeyDown={e => {
              if(e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing){
                e.preventDefault();

                if(!answer.busy){
                  submit();
                }
              }
            }}
            error={error}
          />
          { /* Разные key: иначе React поменял бы type у той же кнопки, и клик «Остановить» отправил бы форму */ }
          <div className="ui-ask__actions">
            { answer.busy
              ? <Button key="stop" size="sm" variant="default" leftSection={<IconPlayerStopFilled size={14} />} onClick={answer.stop}>Остановить</Button>
              : <Button key="ask" type="submit" size="sm" className="ui-ink-button" leftSection={<IconSparkles size={16} stroke={1.8} />}>Спросить</Button> }
          </div>
        </form>
        { answer.phase === 'idle' && examples.length > 0 &&
          <div className="ui-ask__examples" aria-label="Примеры вопросов">
            { examples.map(example => (
              <Button key={example} variant="light" radius="xl" size="xs" onClick={() => askExample(example)}>
                { example }
              </Button>
            )) }
          </div> }
      </section>
      { answer.phase !== 'idle' && <PostAskAnswer state={answer} /> }
    </>
  );
}
