import 'server-only';
import { db } from "@/globals/db";
import BoucerService from "@/globals/services/BouncerService";
import PostsService from "@/globals/services/PostsService";

export const CONTAINER = {
  postService: new PostsService(db),
  boucerService: new BoucerService()
}
