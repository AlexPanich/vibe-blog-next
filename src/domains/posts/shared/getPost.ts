import 'server-only';
import { CONTAINER } from "@/globals/container";
import { cache } from "react";

/*
  Кэш в пределах одного запроса, ключ — id. Принимает число, чтобы '1' и 1
  не стали разными ключами у разных вызывающих.
*/
export const getPost = cache(
  async (id: number) => {
    return CONTAINER.postService.findOrFail(id);
  }
)
