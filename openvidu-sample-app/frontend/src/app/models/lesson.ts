import { User } from './user';

export class Lesson {

  public id?: number;
  public title: string;
  public teacher: User;
  public attenders: User[];

  constructor(title: string) {
    this.title = title;
    this.attenders = [];
  }

}
