import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { LABEL_PROFILE } from '../../users/services/usersData';
import { UserService } from 'src/app/services/user.service';
import { LessonService } from 'src/app/services/lesson.service';
import { GLOBAL } from 'src/app/services/GLOBAL';
import { User } from 'src/app/models/user.model';
import { UntypedFormControl, Validators } from '@angular/forms';

@Component({
    selector: 'call',
    templateUrl: './call.component.html',
    standalone: false
})
export class CallComponent implements OnInit {
    public title:string;
    public identity;
    public token;
    public url;

    public categories = {
        teacher: {
            label:"Docente",
            class:"badge-success"
        },
        guest: {
            label:"Invitado",
            class:"badge-orange"
        },
        student: {
            label:"Estudiante",
            class:"badge-info"
        },
        expert: {
            label:"Facilitador",
            class:"badge-purple"
        },
        admin: {
            label:"Administrador",
            class:"badge-green"
        },
        delegated_admin: {
            label:"Administrador",
            class:"badge-green"
        }
    };    

    public expertUsers = [];
    public profile_label;
    
    public expert;
    public leader;

    public submitted;
    public status;

    @Input() lesson;
    @Output() assigned = new EventEmitter();
    
    constructor(
        private _userService: UserService,
        private _lessonService: LessonService
    ) { 
        this.title = 'Detalles convocatoria';
        this.identity = this._userService.getIdentity();
        this.token = this._userService.getToken();
        this.url = GLOBAL.url;

        this.leader = new UntypedFormControl('');
        
        this.expert = new UntypedFormControl('', Validators.required);

        this.profile_label = LABEL_PROFILE;
        
    }

    ngOnInit(): void { 
        this.getExpertUsers();
        this.initializeLesson();
        this.setLeader();
    }

    initializeLesson(): void {
        // Asegurar que development_group existe
        if (!this.lesson.development_group) {
            this.lesson.development_group = [];
        }
        
        // Asegurar que call existe
        if (!this.lesson.call) {
            this.lesson.call = {
                text: '',
                visible: false,
                interested: []
            };
        }
        
        // IMPORTANTE: Solo inicializar interested si realmente no existe
        // No sobrescribir si ya tiene datos
        if (!this.lesson.call.interested) {
            this.lesson.call.interested = [];
        }
        
        console.log('Call interested after initialization:', this.lesson.call.interested);
        console.log('Development group after initialization:', this.lesson.development_group);
        
        // Debug adicional para development_group
        if (this.lesson.development_group && this.lesson.development_group.length > 0) {
            console.log('Development group types:', this.lesson.development_group.map(member => typeof member));
            console.log('First development group member:', this.lesson.development_group[0]);
        }
        
        // Inicializar el valor del líder
        const leaderValue = this.getLeader();
        if (leaderValue) {
            this.leader.setValue(leaderValue);
        }
    }       
    setLeader(){
        if(this.lesson.development_group.length > 0){
            this.leader.enable();
        } 
        else{
        this.leader.disable();
        }
    }
    getLeader(){
        return this.lesson.leader;
    }
    restartValues() {
        this.status = null;
        this.submitted = false;
        this.assigned.emit();
        
        // Reinicializar controles de formulario
        this.leader = new UntypedFormControl('');
        this.expert = new UntypedFormControl('', Validators.required);
        
        // Reinicializar valores si hay una lección
        if (this.lesson) {
            this.initializeLesson();
            this.setLeader();
        }
    }

    getExpertUsers(){
        this._userService.getAllUsers().subscribe(
            response => {             
                this.expertUsers = response.users.filter(user => {
                    return user.role == 'expert' || user.role == 'admin' || user.role == 'delegated_admin' || user.canAdvise;
                });
            },
            error => {
                console.log(<any>error);
            }
        )
    }

    addGroup(interested){
        // Verificar que el usuario no esté ya en el grupo de desarrollo
        const isAlreadyInGroup = this.lesson.development_group.some(member => 
            member._id === interested._id
        );

        if (!isAlreadyInGroup) {
            this.lesson.development_group.push(interested);
        }

        if(this.lesson.development_group.length > 0){
            this.leader.enable();
        } 
    }

    removeGroup(interested){
        let found = this.lesson.development_group.find((item, ix) => {
            if(item._id == interested._id){
                this.lesson.development_group.splice(ix,1);
            }
            return item._id == interested._id;            
        });

        if(this.lesson.development_group.length == 0){
            this.leader.disable();
        }
    }

    isInDevelopmentGroup(interested){
        if (!this.lesson || !this.lesson.development_group || !interested) {
            return false;
        }

        let found = this.lesson.development_group.find(item => {
            return item._id == interested._id;
        });

        return !!found;
    }

    belongsTo(expert): void{
        // Verificar si el experto ya está en el grupo de desarrollo
        let found = this.lesson.development_group.find(item => {
            return item._id == expert;
        });    
        
        if (!found){
            let expertU = this.expertUsers.find(item => {
                return item._id == expert;
            });

            if (expertU) {
                // Verificación adicional para evitar duplicados
                const isDuplicate = this.lesson.development_group.some(member => 
                    member._id === expertU._id
                );
                
                if (!isDuplicate) {
                    this.lesson.development_group.push(expertU);
                    console.log("Experto agregado al grupo de desarrollo");
                }
            }
        }
    }
    editLesson() {
        this.submitted = true;

        if(this.expert.invalid || this.leader.invalid){
            return;
        }

        this.lesson.leader = this.leader.value;
        this.lesson.expert = this.expert.value;
        
        if(this.lesson.leader == this.lesson.expert){
            console.log("son iguales");
        }
        this.lesson.state = 'assigned';
        this.lesson.call.visible = false;
        
        this.belongsTo(this.expert.value);
        
        console.log("Enviando actualización de lección (call):", {
            id: this.lesson._id,
            leader: this.lesson.leader,
            expert: this.lesson.expert,
            state: this.lesson.state
        });

        this._lessonService.editLesson(this.token, this.lesson).subscribe({
            next: response => {
                if (response && response.lesson._id) {
                    this.status = 'success';
                    this.assigned.emit();
                    console.log("Lección asignada exitosamente");

                    // Crear conversación General por defecto con un primer mensaje
                    const initialText = 'comienza a hablar';
                    this._lessonService.addLessonMessage(this.token, this.lesson._id, { text: initialText, conversationTitle: 'General' })
                        .subscribe({
                            next: () => {
                                console.log('Conversación General creada automáticamente');
                            },
                            error: (err) => {
                                console.error('No se pudo crear la conversación General por defecto:', err);
                            }
                        });
                } else {
                    this.status = 'error';
                    console.error("Respuesta inválida del servidor");
                }
            },
            error: error => {
                this.status = 'error';
                console.error('Error updating lesson call:', error);
                
                // Manejo específico de errores
                if (error.status === 500) {
                    console.error('Error interno del servidor. Por favor, verifica que todos los campos estén correctamente completados.');
                } else if (error.status === 400) {
                    console.error(error.error?.message || 'Datos inválidos. Por favor, revisa los campos del formulario.');
                } else if (error.status === 404) {
                    console.error('La lección no fue encontrada.');
                } else {
                    console.error(error.error?.message || 'Error al asignar el grupo a la lección.');
                }
            }
        })

        document.querySelector('.modal-body').scrollTop = 0;
    }

}
