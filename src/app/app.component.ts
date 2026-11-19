import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`
    <main class="page">
      <section class="intro">
        <div class="eyebrow">KORA COMMUNITY</div>
        <h1>Play together.<br><em>Belong together.</em></h1>
        <p>Join our social football community and tell us a little about yourself.</p>
        <div class="football" aria-hidden="true">⚽</div>
      </section>
      <section class="panel">
        <div class="panel-header"><span class="step">01 / PLAYER DETAILS</span><span class="pill">EVENT SIGN-UP</span></div>
        <h2>Join the game</h2>
        <p class="sub">Complete the form below to register with KORA.</p>
        @if (success()) {
          <div class="message success" role="status">You're registered! We look forward to seeing you on the pitch.</div>
          <button type="button" (click)="reset()">Register another person</button>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <label for="name">Full name <span>*</span></label>
            <input id="name" formControlName="name" autocomplete="name" placeholder="Your full name" maxlength="100"/>
            <div class="split">
              <div><label for="shirt_size">Shirt size <span>*</span></label>
                <select id="shirt_size" formControlName="shirt_size"><option value="" disabled>Select size</option>@for (size of sizes; track size) {<option [value]="size">{{size}}</option>}</select>
              </div>
              <div><label for="player_number">Shirt number <span>*</span></label>
                <input id="player_number" formControlName="player_number" inputmode="numeric" type="number" min="0" max="99" placeholder="e.g. 10"/>
              </div>
            </div>
            <label for="instagram">Instagram <span>*</span></label>
            <input id="instagram" formControlName="instagram" placeholder="@yourhandle" maxlength="31"/>
            <label for="location">Where would you play social football? <span>*</span></label>
            <input id="location" formControlName="location" placeholder="City or preferred location" maxlength="120"/>
            <label for="phone">Phone number <span>*</span></label>
            <input id="phone" formControlName="phone" type="tel" autocomplete="tel" placeholder="+49 170 1234567" maxlength="24"/>
            <label for="email">Email address <span>*</span></label>
            <input id="email" formControlName="email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="254"/>
            <label class="checkbox">
              <input type="checkbox" formControlName="marketing_consent"/>
              <span>I agree to receive promotional offers and event updates from KORA by email or phone. This is optional, and I can withdraw consent later.</span>
            </label>
            @if (error()) { <div class="message error" role="alert">{{error()}}</div> }
            <button type="submit" [disabled]="submitting()">{{submitting() ? 'Registering…' : 'Complete registration →'}}</button>
            <p class="privacy">We use your details to manage registration. Marketing messages are sent only with your consent. Please refer to the organizer's privacy notice for data rights and contact details.</p>
          </form>
        }
      </section>
    </main>
  \`
})
export class AppComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  readonly sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    shirt_size: ['', Validators.required],
    player_number: [10, [Validators.required, Validators.min(0), Validators.max(99)]],
    instagram: ['', [Validators.required, Validators.pattern(/^@?[A-Za-z0-9._]{1,30}$/)]],
    location: ['', [Validators.required, Validators.maxLength(120)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9() .-]{7,24}$/)]],
    email: ['', [Validators.required, Validators.email]],
    marketing_consent: [false]
  });

  submit(): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Please check every required field and provide valid contact details.');
      return;
    }
    this.error.set('');
    this.submitting.set(true);
    this.http.post('/api/register', this.form.getRawValue())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.success.set(true),
        error: (err: HttpErrorResponse) => {
          this.error.set(err.status === 409
            ? 'You may already be registered. Contact the organizer to update your details.'
            : err.status === 429 ? 'Too many attempts. Please try later.'
            : err.status === 400 ? 'Please check your details. Include your country prefix in your phone number.'
            : 'Registration could not be completed. Please try again.');
        }
      });
  }
  reset(): void {
    this.success.set(false);
    this.error.set('');
    this.form.reset();
  }
}
