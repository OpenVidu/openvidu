import { Lesson } from './lesson';

export class User {

  public id?: number;
  public name: string;
  public nickName: string;
  public roles: string[];
  public lessons: Lesson[];

  constructor(u: User) {
    this.id = u.id;
    this.name = u.name;
    this.nickName = u.nickName;
    this.roles = u.roles;
    this.lessons = [];
  }

}
