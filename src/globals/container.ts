import 'server-only';
import { db } from "@/globals/db";
import BoucerService from "@/globals/services/BouncerService";
import PostsService from "@/globals/services/PostsService";

/*
  lazy
  like nestbox with decarator, reflection ...
  singleton
*/

export const CONTAINER = {
  postService: new PostsService(db),
  boucerService: new BoucerService()
}
