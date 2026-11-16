<script lang="ts">
	import { axiosA } from '#lib/adapters/Axios.adapter.ts';
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Spinner } from '#lib/components/ui/spinner/index.ts';
	import { getApiErrorMessage } from '#lib/helpers/client/getApiErrorMessage.ts';
	import { CalendarDays, PencilIcon, PlusIcon, TrashIcon } from '@lucide/svelte/icons';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';

	type Employee = {
		id: number;
		cedula: string;
		nombres: string;
		apellidos: string;
	};

	type Permission = {
		id: number;
		descripcion: string;
		patologia: string;
		fechaInicio: string;
		fechaFin: string;
		status: 0 | 1;
		personal: Employee;
	};

	let { data }: PageProps = $props();
	let employees = $state<Employee[]>([]);
	let permissions = $state<Permission[]>([]);
	let saving = $state(false);
	let deleting = $state(false);
	let selectedPermission = $state<Permission | null>(null);
	let deleteDialogOpen = $state(false);
	let editingId = $state<number | null>(null);
	let form = $state({
		idPersonal: '',
		descripcion: '',
		patologia: '',
		fechaInicio: '',
		fechaFin: ''
	});

	$effect(() => {
		employees = [...data.employees];
		permissions = [...data.permissions];
	});

	const clearForm = () => {
		editingId = null;
		form = { idPersonal: '', descripcion: '', patologia: '', fechaInicio: '', fechaFin: '' };
	};

	const canEdit = (permission: Permission) =>
		permission.status === 1 && permission.fechaInicio.slice(0, 10) > data.today;

	const editPermission = (permission: Permission) => {
		editingId = permission.id;
		form = {
			idPersonal: String(permission.personal.id),
			descripcion: permission.descripcion,
			patologia: permission.patologia,
			fechaInicio: permission.fechaInicio.slice(0, 10),
			fechaFin: permission.fechaFin.slice(0, 10)
		};
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const savePermission = async () => {
		if (form.fechaInicio > form.fechaFin) {
			toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
			return;
		}
		saving = true;
		try {
			const payload = {
				...form,
				idPersonal: Number(form.idPersonal)
			};
			const response =
				editingId === null
					? await axiosA.post('/asistencia/permisos', payload)
					: await axiosA.put(`/asistencia/permisos/${editingId}`, payload);
			const permission = response.data as Permission;
			permissions =
				editingId === null
					? [permission, ...permissions].sort((a, b) =>
							b.fechaInicio.localeCompare(a.fechaInicio)
						)
					: permissions.map((item) => (item.id === permission.id ? permission : item))
							.sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));
			toast.success(editingId === null ? 'Permiso registrado' : 'Permiso actualizado');
			clearForm();
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			saving = false;
		}
	};

	const deletePermission = async () => {
		if (!selectedPermission) return;
		deleting = true;
		try {
			await axiosA.delete(`/asistencia/permisos/${selectedPermission.id}`);
			permissions = permissions.filter((permission) => permission.id !== selectedPermission?.id);
			toast.success('Permiso eliminado');
			selectedPermission = null;
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			deleting = false;
		}
	};

</script>

<svelte:head>
	<title>Permisos del personal</title>
</svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col items-center gap-6 px-4 py-8">
	<div class="text-center">
		<h1 class="text-2xl font-bold">Permisos del personal</h1>
		<p class="mt-1 text-muted-foreground">Registra y consulta los permisos médicos del personal.</p>
	</div>

	<Card.Root class="w-full max-w-3xl">
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<CalendarDays class="size-5" />
				{editingId === null ? 'Registrar permiso' : 'Editar permiso'}
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<form
				class="space-y-4"
				onsubmit={(event) => {
					event.preventDefault();
					void savePermission();
				}}
			>
				<Field.Group>
					<Field.Field>
						<Label for="permission-employee">Personal</Label>
						<select
							id="permission-employee"
							bind:value={form.idPersonal}
							required
							disabled={saving || employees.length === 0}
							class="h-9 w-full rounded-3xl border border-input bg-input/50 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50"
						>
							<option value="" disabled>Selecciona una persona</option>
							{#each employees as employee (employee.id)}
								<option value={String(employee.id)}>
									{employee.apellidos}, {employee.nombres} — {employee.cedula}
								</option>
							{/each}
						</select>
					</Field.Field>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Label for="permission-description">Descripción</Label>
							<Input id="permission-description" bind:value={form.descripcion} maxlength={2000} required disabled={saving} />
						</Field.Field>
						<Field.Field>
							<Label for="permission-condition">Patología</Label>
							<Input id="permission-condition" bind:value={form.patologia} maxlength={2000} required disabled={saving} />
						</Field.Field>
					</div>
					<div class="grid gap-4 sm:grid-cols-2">
						<Field.Field>
							<Label for="permission-start">Fecha de inicio</Label>
							<Input id="permission-start" type="date" bind:value={form.fechaInicio} required disabled={saving} />
						</Field.Field>
						<Field.Field>
							<Label for="permission-end">Fecha de fin</Label>
							<Input id="permission-end" type="date" bind:value={form.fechaFin} required disabled={saving} />
						</Field.Field>
					</div>
				</Field.Group>
				<div class="flex flex-wrap justify-end gap-2">
					{#if editingId !== null}
						<Button type="button" variant="outline" onclick={clearForm} disabled={saving}>Cancelar edición</Button>
					{/if}
					<Button type="submit" disabled={saving || employees.length === 0}>
						{#if saving}<Spinner class="size-4" />{:else}<PlusIcon class="size-4" />{/if}
						{editingId === null ? 'Registrar permiso' : 'Guardar cambios'}
					</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root class="w-full max-w-5xl">
		<Card.Header><Card.Title>Permisos registrados</Card.Title></Card.Header>
		<Card.Content>
			{#if permissions.length === 0}
				<p class="py-8 text-center text-muted-foreground">No hay permisos registrados.</p>
			{:else}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Personal</Table.Head>
								<Table.Head>Descripción</Table.Head>
								<Table.Head>Desde</Table.Head>
								<Table.Head>Hasta</Table.Head>
								<Table.Head>Estado</Table.Head>
								<Table.Head class="text-right">Acciones</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each permissions as permission (permission.id)}
								<Table.Row>
									<Table.Cell class="font-medium">
										{permission.personal.apellidos}, {permission.personal.nombres}
									</Table.Cell>
									<Table.Cell>{permission.descripcion}</Table.Cell>
									<Table.Cell>{permission.fechaInicio.slice(0, 10)}</Table.Cell>
									<Table.Cell>{permission.fechaFin.slice(0, 10)}</Table.Cell>
									<Table.Cell>{permission.status === 1 ? 'Activo' : 'Culminado'}</Table.Cell>
									<Table.Cell class="text-right">
										<div class="flex justify-end gap-2">
											<Button
												variant="outline"
												size="icon"
												aria-label="Editar permiso"
												disabled={!canEdit(permission)}
												onclick={() => editPermission(permission)}
											>
												<PencilIcon class="size-4" />
											</Button>
											<Button
												variant="destructive"
												size="icon"
												aria-label="Eliminar permiso"
												disabled={!canEdit(permission)}
												onclick={() => {
													selectedPermission = permission;
													deleteDialogOpen = true;
												}}
											>
												<TrashIcon class="size-4" />
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
				<p class="mt-3 text-xs text-muted-foreground">
					Los permisos vigentes o culminados no pueden modificarse ni eliminarse.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</main>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Eliminar permiso</Dialog.Title>
			<Dialog.Description>
				¿Deseas eliminar el permiso de {selectedPermission?.personal.nombres}
				{selectedPermission?.personal.apellidos}? Esta acción no se puede deshacer.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}<Button {...props} variant="outline" disabled={deleting}>Cancelar</Button>{/snippet}
			</Dialog.Close>
			<Button variant="destructive" onclick={deletePermission} disabled={deleting}>
				{#if deleting}<Spinner class="size-4" />{/if}
				Eliminar
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
