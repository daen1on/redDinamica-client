export class Comment {
    public _id: string;
    public rating: Number;
    public created_at: Date;
    public likes: string[] = []; // Array de IDs de usuarios que dieron like
    public likesCount: number = 0;
    public replies: Comment[] = []; // Comentarios anidados (respuestas)
    public parentId: string | null = null; // ID del comentario padre si es una respuesta

    constructor(
        public text: String,
        public user: any
    ){}
}



