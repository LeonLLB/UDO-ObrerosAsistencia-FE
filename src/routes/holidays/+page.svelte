<script lang="ts">
	import { axiosA } from '#lib/adapters/Axios.adapter.ts';
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Popover from '#lib/components/ui/popover/index.ts';
	import { RangeCalendar } from '#lib/components/ui/range-calendar/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { Spinner } from '#lib/components/ui/spinner/index.ts';
	import { getApiErrorMessage } from '#lib/helpers/client/getApiErrorMessage.ts';
	import { DateFormatter, getLocalTimeZone, parseDate, type DateValue } from '@internationalized/date';
	import { CalendarDays, CalendarIcon, PencilIcon, PlusIcon, TrashIcon } from '@lucide/svelte/icons';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';

	type Holiday = {
		id: number;
		descripcion: string;
		fechaInicio: string;
		fechaFin: string;
	};

	let { data }: PageProps = $props();
	let holidays = $state<Holiday[]>([]);
	let saving = $state(false);
	let deleting = $state(false);
	let selectedHoliday = $state<Holiday | null>(null);
	let deleteDialogOpen = $state(false);
	let formDialogOpen = $state(false);
	let datePickerOpen = $state(false);
	let editingId = $state<number | null>(null);
	let form = $state({ descripcion: '', fechaInicio: '', fechaFin: '' });
	let dateRange = $state<{ start: DateValue | undefined; end: DateValue | undefined }>({
		start: undefined,
		end: undefined
	});

	const dateFormatter = new DateFormatter('es-VE', { dateStyle: 'medium' });
	const dateRangeLabel = $derived.by(() => {
		if (!dateRange.start) return 'Selecciona un rango de fechas';
		const start = dateFormatter.format(dateRange.start.toDate(getLocalTimeZone()));
		if (!dateRange.end) return `${start} – Selecciona la fecha de fin`;
		const end = dateFormatter.format(dateRange.end.toDate(getLocalTimeZone()));
		return `${start} – ${end}`;
	});

	$effect(() => {
		holidays = [...data.holidays];
	});

	const clearForm = () => {
		editingId = null;
		form = { descripcion: '', fechaInicio: '', fechaFin: '' };
		dateRange = { start: undefined, end: undefined };
		datePickerOpen = false;
		formDialogOpen = false;
	};

	const openCreateDialog = () => {
		clearForm();
		formDialogOpen = true;
	};

	const editHoliday = (holiday: Holiday) => {
		editingId = holiday.id;
		form = {
			descripcion: holiday.descripcion,
			fechaInicio: holiday.fechaInicio.slice(0, 10),
			fechaFin: holiday.fechaFin.slice(0, 10)
		};
		dateRange = {
			start: parseDate(holiday.fechaInicio.slice(0, 10)),
			end: parseDate(holiday.fechaFin.slice(0, 10))
		};
		datePickerOpen = false;
		formDialogOpen = true;
	};

	const updateDateRange = (range: { start: DateValue | undefined; end: DateValue | undefined }) => {
		form.fechaInicio = range.start?.toString() ?? '';
		form.fechaFin = range.end?.toString() ?? '';
		if (range.end) datePickerOpen = false;
	};

	const saveHoliday = async () => {
		if (!form.fechaInicio || !form.fechaFin) {
			toast.error('Selecciona las fechas de inicio y fin');
			return;
		}
		if (form.fechaInicio > form.fechaFin) {
			toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
			return;
		}
		saving = true;
		try {
			const response =
				editingId === null
					? await axiosA.post('/asistencia/feriados', form)
					: await axiosA.put(`/asistencia/feriados/${editingId}`, form);
			const holiday = response.data as Holiday;
			holidays =
				editingId === null
					? [...holidays, holiday].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
					: holidays.map((item) => (item.id === holiday.id ? holiday : item))
						.sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
			toast.success(editingId === null ? 'Día feriado registrado' : 'Día feriado actualizado');
			clearForm();
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			saving = false;
		}
	};

	const deleteHoliday = async () => {
		if (!selectedHoliday) return;
		deleting = true;
		try {
			await axiosA.delete(`/asistencia/feriados/${selectedHoliday.id}`);
			holidays = holidays.filter((holiday) => holiday.id !== selectedHoliday?.id);
			toast.success('Día feriado eliminado');
			selectedHoliday = null;
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			deleteDialogOpen = false;
			deleting = false;
		}
	};

</script>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col items-center gap-6 px-4 py-8">
	<div class="flex w-full flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold">Feriados Configurados</h1>
		</div>
		<Button onclick={openCreateDialog}>
			<PlusIcon class="size-4" />
			Registrar feriado
		</Button>
	</div>

	<Card.Root class="w-full">
		<Card.Content class="p-4 sm:p-6">
			{#if holidays.length === 0}
				<p class="py-8 text-center text-muted-foreground">No hay días feriados registrados.</p>
			{:else}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Descripción</Table.Head>
								<Table.Head>Desde</Table.Head>
								<Table.Head>Hasta</Table.Head>
								<Table.Head class="text-right">Acciones</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each holidays as holiday (holiday.id)}
								<Table.Row>
									<Table.Cell class="font-medium">{holiday.descripcion}</Table.Cell>
									<Table.Cell>{holiday.fechaInicio.slice(0, 10)}</Table.Cell>
									<Table.Cell>{holiday.fechaFin.slice(0, 10)}</Table.Cell>
									<Table.Cell class="text-right">
										<div class="flex justify-end gap-2">
											<Button variant="outline" size="icon" aria-label="Editar feriado" onclick={() => editHoliday(holiday)}>
												<PencilIcon class="size-4" />
											</Button>
											<Button variant="destructive" size="icon" aria-label="Eliminar feriado" onclick={() => {
												selectedHoliday = holiday;
												deleteDialogOpen = true;
											}}>
												<TrashIcon class="size-4" />
											</Button>
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</main>

<Dialog.Root bind:open={formDialogOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<CalendarDays class="size-5" />
				{editingId === null ? 'Registrar día feriado' : 'Editar día feriado'}
			</Dialog.Title>
		</Dialog.Header>
		<form
			onsubmit={(event) => {
				event.preventDefault();
				void saveHoliday();
			}}
		>
			<Field.Group>
				<Field.Field>
					<Label for="holiday-description">Descripción</Label>
					<Input
						id="holiday-description"
						bind:value={form.descripcion}
						maxlength={2000}
						required
						disabled={saving}
					/>
				</Field.Field>
				<Field.Field>
					<Label for="holiday-dates">Rango de fechas</Label>
					<Popover.Root bind:open={datePickerOpen}>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									{...props}
									id="holiday-dates"
									variant="outline"
									class="w-full justify-start text-left font-normal"
									aria-label="Seleccionar rango de fechas"
									aria-required="true"
									disabled={saving}
								>
									<CalendarIcon class="size-4" />
									{dateRangeLabel}
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-auto p-0">
							<RangeCalendar
								bind:value={dateRange}
								onValueChange={updateDateRange}
								locale="es-VE"
								weekStartsOn={1}
								disabled={saving}
							/>
						</Popover.Content>
					</Popover.Root>
					<Field.Description>Elige primero el día de inicio y luego el día de fin.</Field.Description>
				</Field.Field>
			</Field.Group>
			<Dialog.Footer class="mt-6">
				<Dialog.Close>
					{#snippet child({ props })}
						<Button {...props} variant="outline" disabled={saving} onclick={clearForm}>Cancelar</Button>
					{/snippet}
				</Dialog.Close>
				<Button type="submit" disabled={saving}>
					{#if saving}<Spinner class="size-4" />{:else}<PlusIcon class="size-4" />{/if}
					{editingId === null ? 'Registrar feriado' : 'Guardar cambios'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Eliminar día feriado</Dialog.Title>
			<Dialog.Description>
				¿Deseas eliminar “{selectedHoliday?.descripcion}”? Esta acción no se puede deshacer.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}<Button {...props} variant="outline" disabled={deleting}>Cancelar</Button>{/snippet}
			</Dialog.Close>
			<Button variant="destructive" onclick={deleteHoliday} disabled={deleting}>
				{#if deleting}<Spinner class="size-4" />{/if}
				Eliminar
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
