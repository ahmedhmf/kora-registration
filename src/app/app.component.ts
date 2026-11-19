import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <main class="page">
      <section class="intro" role="img" aria-label="KORA football on the pitch. Play together. Belong together."></section>
      <section class="panel">
        <div class="panel-header"><span class="step">01 / PLAYER DETAILS</span><span class="pill">EVENT SIGN-UP</span></div>
        <h2>Join the game</h2>
        <p class="sub">Complete the form below to play KORA with Social Football.</p>
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
            <select id="location" formControlName="location"><option value="" disabled>Select a location</option>@for (place of locations; track place) {<option [value]="place">{{place}}</option>}</select>
            <label for="phone">Phone number <span>*</span></label>
            <div class="phone-row">
              <select class="country-select" aria-label="Country calling code" formControlName="country" id="country">
                @for (country of countries; track country.code) {
                  <option [value]="country.code">{{country.flag}} {{country.name}} (+{{country.dial}})</option>
                }
              </select>
              <input id="phone" formControlName="phone" type="tel" autocomplete="tel-national" inputmode="tel" placeholder="010 1234 5678" maxlength="32" aria-label="National phone number"/>
            </div>
            <p class="phone-hint">Country code +{{selectedDialCode}} is added automatically.</p>
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
  `
})
export class AppComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  readonly sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
  readonly locations = ['Heliopolis', 'Tagamoa', 'Maadi', 'Zayed', 'Alexandria', 'International (soon)'];
  private readonly regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  readonly countries = getCountries().map(code => ({
    code,
    flag: [...code].map(letter => String.fromCodePoint(letter.charCodeAt(0) + 127397)).join(''),
    dial: getCountryCallingCode(code),
    name: this.regionNames.of(code) ?? code
  })).sort((left, right) => left.name.localeCompare(right.name));
  get selectedDialCode(): string {
    return getCountryCallingCode(this.form.controls.country.value);
  }
  readonly submitting = signal(false);
  readonly success = signal(false);
  readonly error = signal('');
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    shirt_size: ['', Validators.required],
    player_number: [10, [Validators.required, Validators.min(0), Validators.max(99)]],
    instagram: ['', [Validators.required, Validators.pattern(/^@?[A-Za-z0-9._]{1,30}$/)]],
    location: ['', Validators.required],
    country: ['EG' as CountryCode, Validators.required],
    phone: ['', [Validators.required, Validators.maxLength(32)]],
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
    const values = this.form.getRawValue();
    const parsed = parsePhoneNumberFromString(values.phone, values.country);
    if (!parsed?.isValid() || parsed.country !== values.country) {
      this.error.set('Please enter a valid phone number for the selected country.');
      return;
    }
    this.error.set('');
    this.submitting.set(true);
    const { country, ...details } = values;
    this.http.post('/api/register', { ...details, phone: parsed.number })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.success.set(true),
        error: (err: HttpErrorResponse) => {
          this.error.set(err.status === 409
            ? 'You may already be registered. Contact the organizer to update your details.'
            : err.status === 429 ? 'Too many attempts. Please try later.'
            : err.status === 400 ? 'Please check your registration details and phone number.'
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
