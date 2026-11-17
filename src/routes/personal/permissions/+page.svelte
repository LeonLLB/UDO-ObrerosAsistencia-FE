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
		activePermission: Permission | null;
	};

	type Permission = {
		id: number;
		descripcion: string;
		patologia: string;
		fechaInicio: string;
		fechaFin: string;
		status: 0 | 1;
	};

	let { data }: PageProps = $props();
	let employees = $state<Employee[]>([]);
	let saving = $state(false);
	let deleting = $state(false);
	let selectedPermission = $state<Permission | null>(null);
	let selectedEmployee = $state<Employee | null>(null);
	let deleteDialogOpen = $state(false);
	let formDialogOpen = $state(false);
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
	});

	const clearForm = () => {
		editingId = null;
		form = { idPersonal: '', descripcion: '', patologia: '', fechaInicio: '', fechaFin: '' };
		formDialogOpen = false;
	};

	const openCreateDialog = () => {
		clearForm();
		formDialogOpen = true;
	};

	const canManagePermission = (permission: Permission) =>
		permission.status === 1 && permission.fechaFin.slice(0, 10) >= data.today;

	const permissionLabel = (permission: Permission) => {
		if (!canManagePermission(permission)) return 'Culminado';
		return permission.fechaInicio.slice(0, 10) > data.today ? 'Programado' : 'Activo';
	};

	const editPermission = (employee: Employee, permission: Permission) => {
		editingId = permission.id;
		form = {
			idPersonal: String(employee.id),
			descripcion: permission.descripcion,
			patologia: permission.patologia,
			fechaInicio: permission.fechaInicio.slice(0, 10),
			fechaFin: permission.fechaFin.slice(0, 10)
		};
		formDialogOpen = true;
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
			const employeeId = Number(form.idPersonal);
			employees = employees.map((employee) =>
					employee.id === employeeId
						? { ...employee, activePermission: canManagePermission(permission) ? permission : null }
						: employee
			);
			toast.success(editingId === null ? 'Permiso registrado' : 'Permiso actualizado');
			clearForm();
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			saving = false;
		}
	};

	const deletePermission = async () => {
		if (!selectedPermission || !selectedEmployee) return;
		const employeeId = selectedEmployee.id;
		deleting = true;
		try {
			await axiosA.delete(`/asistencia/permisos/${selectedPermission.id}`);
			employees = employees.map((employee) =>
				employee.id === employeeId ? { ...employee, activePermission: null } : employee
			);
			toast.success('Permiso eliminado');
			selectedPermission = null;
			selectedEmployee = null;
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			deleteDialogOpen = false;
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
	</div>

	<div class="flex w-full justify-center">
		<Button onclick={openCreateDialog} disabled={employees.length === 0}>
			<PlusIcon class="size-4" />
			Registrar permiso
		</Button>
	</div>

	<Dialog.Root bind:open={formDialogOpen}>
		<Dialog.Content class="sm:max-w-2xl">
			<Dialog.Header>
				<Dialog.Title class="flex items-center gap-2">
					<CalendarDays class="size-5" />
					{editingId === null ? 'Registrar permiso' : 'Editar permiso'}
				</Dialog.Title>
				<Dialog.Description>
					{editingId === null
						? 'Completa los datos del permiso médico del funcionario.'
						: 'Actualiza los datos del permiso vigente.'}
				</Dialog.Description>
			</Dialog.Header>
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
							disabled={saving || employees.length === 0 || editingId !== null}
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
				<Dialog.Footer>
					<Button type="button" variant="outline" onclick={clearForm} disabled={saving}>
						Cancelar
					</Button>
					<Button type="submit" disabled={saving || employees.length === 0}>
						{#if saving}<Spinner class="size-4" />{:else}<PlusIcon class="size-4" />{/if}
						{editingId === null ? 'Registrar permiso' : 'Guardar cambios'}
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>

	<Card.Root class="w-full max-w-5xl">
		<Card.Header><Card.Title>Permisos activos y programados del personal</Card.Title></Card.Header>
		<Card.Content>
			{#if employees.length === 0}
				<p class="py-8 text-center text-muted-foreground">No hay personal registrado.</p>
			{:else}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Personal</Table.Head>
								<Table.Head>Cédula</Table.Head>
								<Table.Head>Descripción</Table.Head>
								<Table.Head>Patología</Table.Head>
								<Table.Head>Permiso</Table.Head>
								<Table.Head class="text-right">Acciones</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each employees as employee (employee.id)}
								<Table.Row>
									<Table.Cell class="font-medium">
										<a
											class="text-primary underline-offset-4 hover:underline"
											href={`/personal/permissions/${encodeURIComponent(employee.cedula)}`}
										>
											{employee.apellidos}, {employee.nombres}
										</a>
									</Table.Cell>
									<Table.Cell>
										<a
											class="text-primary underline-offset-4 hover:underline"
											href={`/personal/permissions/${encodeURIComponent(employee.cedula)}`}
										>
											{employee.cedula}
										</a>
									</Table.Cell>
									<Table.Cell>{employee.activePermission?.descripcion ?? '—'}</Table.Cell>
									<Table.Cell>{employee.activePermission?.patologia ?? '—'}</Table.Cell>
									<Table.Cell>{employee.activePermission?.fechaInicio.slice(0, 10) ?? '—'} - {employee.activePermission?.fechaFin.slice(0, 10) ?? '—'}</Table.Cell>
									<Table.Cell>
										{employee.activePermission
											? permissionLabel(employee.activePermission)
											: 'Sin permiso activo o programado'}
									</Table.Cell>
									<Table.Cell class="text-right">
										<div class="flex justify-end gap-2">
											<Button
												variant="outline"
												size="icon"
												aria-label="Editar permiso"
												disabled={!employee.activePermission || !canManagePermission(employee.activePermission)}
												onclick={() => {
													if (employee.activePermission) editPermission(employee, employee.activePermission);
												}}
											>
												<PencilIcon class="size-4" />
											</Button>
											<Button
												variant="destructive"
												size="icon"
												aria-label="Eliminar permiso"
												disabled={!employee.activePermission || !canManagePermission(employee.activePermission)}
												onclick={() => {
													selectedPermission = employee.activePermission;
													selectedEmployee = employee;
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
					Solo se pueden editar o eliminar los permisos siempre y cuando no este activo, es decir, mientras la fecha actual este dentro de las fechas del permiso registrado.
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
				¿Deseas eliminar el permiso de {selectedEmployee?.nombres}
				{selectedEmployee?.apellidos}? Esta acción no se puede deshacer.
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
