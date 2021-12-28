import {Injectable} from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {GLOBAL} from './global';



@Injectable({
    providedIn: 'any'
})
export class UploadService{
    
    
    public url: string;
    
    constructor(private httpClient: HttpClient){
        this.url = GLOBAL.url;
    }

    makeFileRequest(url: string, params: Array<string>, files: Array<File>, token:string, name:string){
        let formData: any = new FormData();

              //older let xhr = new XMLHttpRequest();
              for(let i = 0; i < files.length; i++){
                  formData.append(name, files[i], files[i].name);
              }
        let headers = new HttpHeaders({
             
            'Authorization': token
        });
        return this.httpClient.post<any>(url, formData, { headers:headers, responseType: 'json', reportProgress: true,
        observe: 'events' });
              
             
        
    }
    
}