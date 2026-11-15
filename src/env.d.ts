/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    adminAuthenticated?: boolean;
    adminEmail?: string;
  }
}
