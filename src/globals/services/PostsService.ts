import 'server-only';
import { DBClient } from "@/globals/db";
import { posts } from "@/database/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default class PostsService{
  constructor(
    protected db: DBClient
  ){}

  get query(){
    return this.db.query.posts;
  }

  async findOrFail(id: number){
    const item = await this.query.findFirst({ where: eq(posts.id, id) });

    if(!item){
      return notFound();
    }

    return item;
  }
}