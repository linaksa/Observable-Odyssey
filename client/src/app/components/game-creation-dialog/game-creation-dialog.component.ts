import { Component, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { AppMaterialModule } from "@app/modules/material.module";

@Component({
  selector: 'app-game-creation-dialog',
  imports: [AppMaterialModule, MatDialogModule, ReactiveFormsModule, MatFormField],
  templateUrl: './game-creation-dialog.component.html',
  styleUrl: './game-creation-dialog.component.scss',
})
export class GameCreationDialogComponent {

  form: FormGroup;
  description: string;
  private dialogRef = inject(MatDialogRef<GameCreationDialogComponent>);


  close() {
    this.dialogRef.close();
  }
}
