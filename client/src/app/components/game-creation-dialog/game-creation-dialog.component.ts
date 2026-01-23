import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatOption } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormField } from '@angular/material/form-field';
import { MatSelect } from '@angular/material/select';
import { AppMaterialModule } from "@app/modules/material.module";


@Component({
    selector: 'app-game-creation-dialog',
    imports: [AppMaterialModule, MatDialogModule, ReactiveFormsModule, MatFormField, MatOption, MatSelect],
    templateUrl: './game-creation-dialog.component.html',
    styleUrl: './game-creation-dialog.component.scss',
})
export class GameCreationDialogComponent implements OnInit {

    form: FormGroup;
    description: string;
    private readonly fb = inject(FormBuilder);

    ngOnInit() {
        this.form = this.fb.group({
            dimension: [''],
            isCTF: [{ value: false, disabled: true }],
        });
    }

    createGame() {
        console.log("khudjshkdhk");

    }
}
