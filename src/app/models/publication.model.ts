export class Publication {
    public _id:String;
    public comments;   
    public file;
    public created_at;
    public likes: string[] = []; // Array de IDs de usuarios que dieron like
    public likesCount: number = 0;

    constructor(
        public text,
        public user
    ){}
}