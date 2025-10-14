import { Component, OnInit } from '@angular/core';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css'],
  standalone: false
})
export class ConfigurationComponent implements OnInit {
  public emailDigestEnabled = true;
  public saving = false;
  public error: string | null = null;

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    // Cargar desde servidor; fallback a localStorage si falla
    this.userService.getMyPreferences().subscribe({
      next: (prefs) => {
        this.emailDigestEnabled = (prefs && typeof prefs.emailDigestEnabled === 'boolean') ? prefs.emailDigestEnabled : true;
        localStorage.setItem('rd_email_digest_enabled', String(this.emailDigestEnabled));
      },
      error: () => {
        const stored = localStorage.getItem('rd_email_digest_enabled');
        this.emailDigestEnabled = stored !== null ? stored === 'true' : true;
      }
    });
  }

  onToggleEmailDigest(): void {
    this.emailDigestEnabled = !this.emailDigestEnabled;
    localStorage.setItem('rd_email_digest_enabled', String(this.emailDigestEnabled));
    this.saving = true;
    this.error = null;
    this.userService.updateMyPreferences({ emailDigestEnabled: this.emailDigestEnabled }).subscribe({
      next: () => { this.saving = false; },
      error: (err) => { this.saving = false; this.error = 'No se pudo guardar en el servidor.'; }
    });
  }
}


