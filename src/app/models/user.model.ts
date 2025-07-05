import { City } from "./city.model";
import { Institution } from "./institution.model";
import { Profession } from "./profession.model";

export class User {
    
    public _id:String;
    public name:String;
    public surname:String;
    public password:String;
    public email:String;        
    public about:String;
    public state:String;
    public role:String;
    public postgraduate:String;
    public picture:String;
    public knowledge_area:String;
    public profession:Profession;
    public institution:Institution;
    public city:City;
    public contactNumber:String;
    public socialNetworks:string;
    public getToken:Boolean;
    public canAdvise;

    constructor(){}
}
