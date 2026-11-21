<script lang="ts">
	import { goto } from '$app/navigation';
	import { axiosA } from '#lib/adapters/Axios.adapter.ts';
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Spinner } from '#lib/components/ui/spinner/index.ts';
	import { getApiErrorMessage } from '#lib/helpers/client/getApiErrorMessage.ts';
	import { ArrowLeft, GraduationCap, Plus, Trash2, UsersRound } from '@lucide/svelte/icons';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';

	type AcademicRecord = {
		id: number;
		tipo: number;
		anioGraduacion: number;
		universidad: string;
		descripcion: string;
		curriculum: {
			id: number;
			idUsuario: number;
			fechaRegistro: string;
			usuario?: string;
		} | null;
	};
	type FamilyRecord = {
		id: number;
		tipo: 'Hi' | 'He' | 'P';
		nombres: string;
		apellidos: string;
		cedula: string | null;
		sexo: 'F' | 'M';
		fechaNacimiento: string;
		estudia: 0 | 1;
	};

	const academicTypes = [
		{ value: '0', label: 'Curso / no conducente a grado' },
		{ value: '1', label: 'TSU' },
		{ value: '2', label: 'Licenciatura / Ingeniería / Abogacía / Arquitectura' },
		{ value: '3', label: 'Especialización' },
		{ value: '4', label: 'Maestría' },
		{ value: '5', label: 'Doctorado' }
	];
	const familyTypes = [
		{ value: 'Hi', label: 'Hijo/a' },
		{ value: 'He', label: 'Hermano/a' },
		{ value: 'P', label: 'Padre / Madre' }
	];
	const sexOptions = [
		{ value: 'F', label: 'Femenino' },
		{ value: 'M', label: 'Masculino' }
	];
	const studyOptions = [
		{ value: '0', label: 'No' },
		{ value: '1', label: 'Sí' }
	];
	const academicTypeLabel = (type: number) =>
		academicTypes.find((option) => option.value === String(type))?.label ?? 'Otro';
	const familyTypeLabel = (type: FamilyRecord['tipo']) =>
		familyTypes.find((option) => option.value === type)?.label ?? type;

	let { data }: PageProps = $props();
	let academicRecords = $state<AcademicRecord[]>([]);
	let familyRecords = $state<FamilyRecord[]>([]);
	let activeTab = $state<'academic' | 'curriculum' | 'family'>('academic');
	let academicDialogOpen = $state(false);
	let familyDialogOpen = $state(false);
	let saving = $state(false);
	let deletingFamilyId = $state<number | null>(null);
	let selectedFamily = $state<FamilyRecord | null>(null);
	let academicForm = $state({
		tipo: '',
		anioGraduacion: '',
		universidad: '',
		descripcion: ''
	});
	let familyForm = $state({
		tipo: '',
		nombres: '',
		apellidos: '',
		cedula: '',
		sexo: '',
		fechaNacimiento: '',
		estudia: '0'
	});

	$effect(() => {
		academicRecords = data.academicRecords;
		familyRecords = data.familyRecords;
	});

	function openAcademicDialog() {
		academicForm = { tipo: '', anioGraduacion: '', universidad: '', descripcion: '' };
		academicDialogOpen = true;
	}

	function openFamilyDialog() {
		familyForm = {
			tipo: '',
			nombres: '',
			apellidos: '',
			cedula: '',
			sexo: '',
			fechaNacimiento: '',
			estudia: '0'
		};
		familyDialogOpen = true;
	}

	async function saveAcademicRecord() {
		if (!academicForm.tipo || !academicForm.anioGraduacion || !academicForm.universidad.trim() || !academicForm.descripcion.trim()) {
			toast.error('Completa todos los datos académicos.');
			return;
		}
		saving = true;
		try {
			const response = await axiosA.post(`/personal/${data.employee.id}/info-academico`, {
				tipo: Number(academicForm.tipo),
				anioGraduacion: Number(academicForm.anioGraduacion),
				universidad: academicForm.universidad.trim(),
				descripcion: academicForm.descripcion.trim()
			});
			const created = response.data as AcademicRecord;
			academicRecords = [created, ...academicRecords].sort(
				(first, second) => second.anioGraduacion - first.anioGraduacion
			);
			academicDialogOpen = false;
			toast.success('Información académica registrada.');
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			saving = false;
		}
	}

	async function saveFamilyRecord() {
		if (
			!familyForm.tipo ||
			!familyForm.nombres.trim() ||
			!familyForm.apellidos.trim() ||
			!familyForm.sexo ||
			!familyForm.fechaNacimiento
		) {
			toast.error('Completa los datos obligatorios de la carga familiar.');
			return;
		}
		saving = true;
		try {
			const response = await axiosA.post(`/personal/${data.employee.id}/info-familiar`, {
				tipo: familyForm.tipo,
				nombres: familyForm.nombres.trim(),
				apellidos: familyForm.apellidos.trim(),
				cedula: familyForm.cedula.trim() || null,
				sexo: familyForm.sexo,
				fechaNacimiento: familyForm.fechaNacimiento,
				estudia: Number(familyForm.estudia)
			});
			familyRecords = [...familyRecords, response.data as FamilyRecord].sort(
				(first, second) =>
					first.apellidos.localeCompare(second.apellidos) ||
					first.nombres.localeCompare(second.nombres)
			);
			familyDialogOpen = false;
			toast.success('Familiar agregado a la carga familiar.');
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			saving = false;
		}
	}

	async function deleteFamilyRecord(family: FamilyRecord) {
		deletingFamilyId = family.id;
		try {
			await axiosA.delete(`/personal/${data.employee.id}/info-familiar/${family.id}`);
			familyRecords = familyRecords.filter((record) => record.id !== family.id);
			selectedFamily = null;
			toast.success('Registro familiar eliminado.');
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			deletingFamilyId = null;
		}
	}

	function backToPersonnel() {
		void goto('/personal');
	}
</script>

<svelte:head>
	<title>Información de {data.employee.nombres} {data.employee.apellidos}</title>
</svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-6 px-4 py-8">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<Button variant="ghost" class="-ml-3 mb-2" onclick={backToPersonnel}>
				<ArrowLeft class="size-4" /> Volver al personal
			</Button>
			<h1 class="text-2xl font-bold">{data.employee.nombres} {data.employee.apellidos}</h1>
			<p class="text-muted-foreground">
				Cédula {data.employee.cedula} · {data.employee.tipo === 'A' ? 'Administrativo' : 'Obrero'}
			</p>
		</div>
	</div>

	<div role="tablist" aria-label="Información del trabajador" class="flex flex-wrap gap-2 border-b">
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'academic'}
			class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium"
			class:border-primary={activeTab === 'academic'}
			class:text-primary={activeTab === 'academic'}
			class:border-transparent={activeTab !== 'academic'}
			class:text-muted-foreground={activeTab !== 'academic'}
			onclick={() => (activeTab = 'academic')}
		>
			<GraduationCap class="size-4" /> Información académica
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'curriculum'}
			class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium"
			class:border-primary={activeTab === 'curriculum'}
			class:text-primary={activeTab === 'curriculum'}
			class:border-transparent={activeTab !== 'curriculum'}
			class:text-muted-foreground={activeTab !== 'curriculum'}
			onclick={() => (activeTab = 'curriculum')}
		>
			Información curricular
		</button>
		<button
			type="button"
			role="tab"
			aria-selected={activeTab === 'family'}
			class="inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium"
			class:border-primary={activeTab === 'family'}
			class:text-primary={activeTab === 'family'}
			class:border-transparent={activeTab !== 'family'}
			class:text-muted-foreground={activeTab !== 'family'}
			onclick={() => (activeTab = 'family')}
		>
			<UsersRound class="size-4" /> Carga familiar
		</button>
	</div>

	{#if activeTab === 'academic'}
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between gap-4">
				<div>
					<Card.Title>Formación académica</Card.Title>
				</div>
				<Button onclick={openAcademicDialog}><Plus class="size-4" /> Agregar formación</Button>
			</Card.Header>
			<Card.Content>
				{#if academicRecords.length === 0}
					<p class="py-8 text-center text-muted-foreground">No hay información académica registrada.</p>
				{:else}
					<div class="overflow-x-auto">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Grado / tipo</Table.Head>
									<Table.Head>Año</Table.Head>
									<Table.Head>Institución donde se graduó</Table.Head>
									<Table.Head>Descripción</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each academicRecords as record (record.id)}
									<Table.Row>
										<Table.Cell class="font-medium">{academicTypeLabel(record.tipo)}</Table.Cell>
										<Table.Cell>{record.anioGraduacion}</Table.Cell>
										<Table.Cell>{record.universidad}</Table.Cell>
										<Table.Cell>{record.descripcion}</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else if activeTab === 'curriculum'}
		<Card.Root>
			<Card.Header>
				<Card.Title>Información curricular</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if academicRecords.every((record) => !record.curriculum)}
					<p class="py-8 text-center text-muted-foreground">No hay movimientos curriculares registrados.</p>
				{:else}
					<div class="overflow-x-auto">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Formación registrada</Table.Head>
									<Table.Head>Institución</Table.Head>
									<Table.Head>Fecha de registro</Table.Head>
									<Table.Head>Usuario que registró</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each academicRecords.filter((record) => record.curriculum) as record (record.curriculum?.id)}
									<Table.Row>
										<Table.Cell class="font-medium">
											{academicTypeLabel(record.tipo)} · {record.descripcion} ({record.anioGraduacion})
										</Table.Cell>
										<Table.Cell>{record.universidad}</Table.Cell>
										<Table.Cell>{record.curriculum?.fechaRegistro}</Table.Cell>
										<Table.Cell>
											{record.curriculum?.usuario ?? `Usuario #${record.curriculum?.idUsuario}`}
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between gap-4">
				<div>
					<Card.Title>Carga familiar</Card.Title>
				</div>
				<Button onclick={openFamilyDialog}><Plus class="size-4" /> Agregar familiar</Button>
			</Card.Header>
			<Card.Content>
				{#if familyRecords.length === 0}
					<p class="py-8 text-center text-muted-foreground">No hay carga familiar registrada.</p>
				{:else}
					<div class="overflow-x-auto">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Familiar</Table.Head>
									<Table.Head>Parentesco</Table.Head>
									<Table.Head>Cédula</Table.Head>
									<Table.Head>Sexo</Table.Head>
									<Table.Head>Fecha de nacimiento</Table.Head>
									<Table.Head>Estudia</Table.Head>
									<Table.Head class="text-right">Acciones</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each familyRecords as family (family.id)}
									<Table.Row>
										<Table.Cell class="font-medium">{family.nombres} {family.apellidos}</Table.Cell>
										<Table.Cell>{familyTypeLabel(family.tipo)}</Table.Cell>
										<Table.Cell>{family.cedula || '—'}</Table.Cell>
										<Table.Cell>{family.sexo === 'F' ? 'Femenino' : 'Masculino'}</Table.Cell>
										<Table.Cell>{family.fechaNacimiento}</Table.Cell>
										<Table.Cell>{family.estudia === 1 ? 'Sí' : 'No'}</Table.Cell>
										<Table.Cell class="text-right">
											<Button
												variant="destructive"
												size="icon"
												aria-label="Eliminar familiar"
												onclick={() => (selectedFamily = family)}
												disabled={deletingFamilyId !== null}
											>
												{#if deletingFamilyId === family.id}<Spinner class="size-4" />{:else}<Trash2 class="size-4" />{/if}
											</Button>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</main>

<Dialog.Root bind:open={academicDialogOpen}>
	<Dialog.Content class="sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>Agregar formación académica</Dialog.Title>
			<Dialog.Description>Registra el grado o curso y la institución donde se obtuvo.</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={(event) => { event.preventDefault(); void saveAcademicRecord(); }}>
			<Field.Group>
				<Field.Field>
					<Label for="academic-type">Grado o tipo</Label>
					<Select.Root bind:value={academicForm.tipo} type="single" items={academicTypes}>
						<Select.Trigger id="academic-type" class="w-full"><Select.Value placeholder="Selecciona el grado" /></Select.Trigger>
						<Select.Content>{#each academicTypes as option (option.value)}<Select.Item value={option.value} label={option.label} />{/each}</Select.Content>
					</Select.Root>
				</Field.Field>
				<Field.Field>
					<Label for="academic-year">Año de graduación</Label>
					<Input id="academic-year" type="number" min="1900" max="9999" step="1" bind:value={academicForm.anioGraduacion} required disabled={saving} />
				</Field.Field>
				<Field.Field>
					<Label for="academic-university">Universidad / institución</Label>
					<Input id="academic-university" bind:value={academicForm.universidad} maxlength={150} required disabled={saving} />
				</Field.Field>
				<Field.Field>
					<Label for="academic-description">Título, carrera o descripción</Label>
					<Input id="academic-description" bind:value={academicForm.descripcion} required disabled={saving} />
				</Field.Field>
			</Field.Group>
			<Dialog.Footer class="mt-4">
				<Button variant="outline" type="button" onclick={() => (academicDialogOpen = false)} disabled={saving}>Cancelar</Button>
				<Button type="submit" disabled={saving}>{#if saving}<Spinner class="size-4" />{/if}Guardar formación</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={familyDialogOpen}>
	<Dialog.Content class="sm:max-w-xl">
		<Dialog.Header>
			<Dialog.Title>Agregar familiar</Dialog.Title>
			<Dialog.Description>Los campos marcados son obligatorios; la cédula es opcional.</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={(event) => { event.preventDefault(); void saveFamilyRecord(); }}>
			<Field.Group>
				<Field.Field>
					<Label for="family-type">Parentesco</Label>
					<Select.Root bind:value={familyForm.tipo} type="single" items={familyTypes}>
						<Select.Trigger id="family-type" class="w-full"><Select.Value placeholder="Selecciona parentesco" /></Select.Trigger>
						<Select.Content>{#each familyTypes as option (option.value)}<Select.Item value={option.value} label={option.label} />{/each}</Select.Content>
					</Select.Root>
				</Field.Field>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Label for="family-first-name">Nombres</Label>
						<Input id="family-first-name" bind:value={familyForm.nombres} maxlength={100} required disabled={saving} />
					</Field.Field>
					<Field.Field>
						<Label for="family-last-name">Apellidos</Label>
						<Input id="family-last-name" bind:value={familyForm.apellidos} maxlength={100} required disabled={saving} />
					</Field.Field>
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Label for="family-id">Cédula (opcional)</Label>
						<Input id="family-id" bind:value={familyForm.cedula} maxlength={20} disabled={saving} />
					</Field.Field>
					<Field.Field>
						<Label for="family-sex">Sexo</Label>
						<Select.Root bind:value={familyForm.sexo} type="single" items={sexOptions}>
							<Select.Trigger id="family-sex" class="w-full"><Select.Value placeholder="Selecciona sexo" /></Select.Trigger>
							<Select.Content>{#each sexOptions as option (option.value)}<Select.Item value={option.value} label={option.label} />{/each}</Select.Content>
						</Select.Root>
					</Field.Field>
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<Field.Field>
						<Label for="family-birth-date">Fecha de nacimiento</Label>
						<Input id="family-birth-date" type="date" bind:value={familyForm.fechaNacimiento} required disabled={saving} />
					</Field.Field>
					<Field.Field>
						<Label for="family-studies">¿Estudia?</Label>
						<Select.Root bind:value={familyForm.estudia} type="single" items={studyOptions}>
							<Select.Trigger id="family-studies" class="w-full"><Select.Value placeholder="Selecciona" /></Select.Trigger>
							<Select.Content>{#each studyOptions as option (option.value)}<Select.Item value={option.value} label={option.label} />{/each}</Select.Content>
						</Select.Root>
					</Field.Field>
				</div>
			</Field.Group>
			<Dialog.Footer class="mt-4">
				<Button variant="outline" type="button" onclick={() => (familyDialogOpen = false)} disabled={saving}>Cancelar</Button>
				<Button type="submit" disabled={saving}>{#if saving}<Spinner class="size-4" />{/if}Agregar familiar</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root open={selectedFamily !== null} onOpenChange={(open) => { if (!open && deletingFamilyId === null) selectedFamily = null; }}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Eliminar familiar</Dialog.Title>
			<Dialog.Description>
				¿Deseas eliminar a {selectedFamily?.nombres} {selectedFamily?.apellidos} de la carga familiar?
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (selectedFamily = null)} disabled={deletingFamilyId !== null}>Cancelar</Button>
			<Button variant="destructive" onclick={() => selectedFamily && deleteFamilyRecord(selectedFamily)} disabled={deletingFamilyId !== null}>
				{#if deletingFamilyId !== null}<Spinner class="size-4" />{/if}Eliminar
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
