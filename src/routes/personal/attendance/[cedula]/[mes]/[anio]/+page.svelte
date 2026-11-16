<script lang="ts">
	import { onDestroy } from 'svelte';
	import { axiosA } from '#lib/adapters/Axios.adapter.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { getApiErrorMessage } from '#lib/helpers/client/getApiErrorMessage.ts';
	import { ArrowLeft, CalendarDays, RotateCw } from '@lucide/svelte/icons';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';

	type AttendanceStatus = 'A' | 'I' | 'P' | 'F' | null;
	type AttendanceWeek = Record<string, AttendanceStatus>;

	type EmployeeMonthlyAttendance = {
		idPersonal: number;
		nombres: string;
		apellidos: string;
		cedula: string;
		dependencia: { id: number; nombre: string };
		semanas: AttendanceWeek[];
	};

	const months = [
		{ value: '1', label: 'Enero' },
		{ value: '2', label: 'Febrero' },
		{ value: '3', label: 'Marzo' },
		{ value: '4', label: 'Abril' },
		{ value: '5', label: 'Mayo' },
		{ value: '6', label: 'Junio' },
		{ value: '7', label: 'Julio' },
		{ value: '8', label: 'Agosto' },
		{ value: '9', label: 'Septiembre' },
		{ value: '10', label: 'Octubre' },
		{ value: '11', label: 'Noviembre' }
	];
	const today = new Date();
	const currentYear = Number(
		new Intl.DateTimeFormat('en-US', { timeZone: 'America/Caracas', year: 'numeric' }).format(today)
	);
	const currentMonth = Number(
		new Intl.DateTimeFormat('en-US', { timeZone: 'America/Caracas', month: 'numeric' }).format(today)
	);
	const years = [currentYear, currentYear - 1, currentYear - 2];
	const yearOptions = years.map((year) => ({ value: String(year), label: String(year) }));
	const weekdays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
	const statusColors: Record<Exclude<AttendanceStatus, null>, string> = {
		A: '#15803d',
		I: '#b91c1c',
		P: '#1d4ed8',
		F: '#64748b'
	};
	const statusLabels: Record<Exclude<AttendanceStatus, null>, string> = {
		A: 'Asistencia',
		I: 'Inasistencia',
		P: 'Permiso',
		F: 'Feriado'
	};

	let { data }: PageProps = $props();
	let selectedMonth = $state(data.mes);
	let selectedYear = $state(data.anio);
	let employee = $state<EmployeeMonthlyAttendance | null>(null);
	let loading = $state(false);
	let periodError = $state('');
	let requestVersion = 0;
	let lastNotifiedInvalidPeriod = '';

	const selectedMonthLabel = $derived(
		months.find((month) => month.value === selectedMonth)?.label ?? ''
	);
	const calendarWeeks = $derived(
		(employee?.semanas ?? []).map((week) => {
			const weekdaysForWeek: ({ day: string; status: AttendanceStatus } | null)[] = Array(5).fill(null);
			for (const [day, status] of Object.entries(week)) {
				if (!/^\d{1,2}$/.test(day)) continue;
				const weekday = new Date(Date.UTC(Number(selectedYear), Number(selectedMonth) - 1, Number(day))).getUTCDay();
				const column = (weekday + 6) % 7;
				if (column < 5) weekdaysForWeek[column] = { day, status };
			}
			return weekdaysForWeek;
		})
	);

	const getStatusLabel = (status: AttendanceStatus) =>
		status ? statusLabels[status] : 'Sin registro';

	const getDateDay = (day: string) => String(Number(day));

	$effect(() => {
		const month = Number(selectedMonth);
		const year = Number(selectedYear);
		const requestId = ++requestVersion;
		const invalidPeriod =
			!Number.isInteger(month) ||
			month < 1 ||
			month > 11 ||
			!years.includes(year) ||
			(year === currentYear && month > currentMonth);

		if (invalidPeriod) {
			employee = null;
			loading = false;
			periodError =
				year === currentYear && month > currentMonth
					? 'No se puede consultar un mes que aún no ha transcurrido.'
					: 'El mes o el año seleccionado no es válido.';
			const periodKey = `${selectedYear}-${selectedMonth}`;
			if (lastNotifiedInvalidPeriod !== periodKey) {
				toast.error(periodError);
				lastNotifiedInvalidPeriod = periodKey;
			}
			return;
		}

		periodError = '';
		lastNotifiedInvalidPeriod = '';
		employee = null;
		loading = true;

		void axiosA
			.get(
				`/asistencia/mensual/${encodeURIComponent(data.cedula)}/${year}/${month}`
			)
			.then((response) => {
				if (requestId !== requestVersion) return;
				if (
					!response.data ||
					typeof response.data !== 'object' ||
					!Array.isArray(response.data.semanas)
				) {
					throw new Error('La respuesta de asistencia del empleado tiene un formato inesperado.');
				}
				employee = response.data as EmployeeMonthlyAttendance;
			})
			.catch((error: unknown) => {
				if (requestId !== requestVersion) return;
				employee = null;
				toast.error(getApiErrorMessage(error));
			})
			.finally(() => {
				if (requestId === requestVersion) loading = false;
			});

		return () => {
			requestVersion += 1;
		};
	});

	onDestroy(() => {
		requestVersion += 1;
	});
</script>

<svelte:head>
	<title>Asistencia de personal</title>
</svelte:head>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col gap-6 px-4 py-8">
	<a
		href={`/personal/attendance?mes=${encodeURIComponent(selectedMonth)}&anio=${encodeURIComponent(selectedYear)}`}
		class="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
	>
		<ArrowLeft class="size-4" />
		Volver a asistencia mensual
	</a>

	<div>
		<h1 class="text-2xl font-bold">Asistencia del personal</h1>		
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<CalendarDays class="size-5" />
				Período de consulta
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 sm:grid-cols-2">
				<Field.Field>
					<Label for="detail-month">Mes</Label>
					<Select.Root bind:value={selectedMonth} type="single" items={months}>
						<Select.Trigger id="detail-month" class="w-full">
							<Select.Value placeholder="Selecciona un mes" />
						</Select.Trigger>
						<Select.Content>
							{#each months as month (month.value)}
								<Select.Item value={month.value} label={month.label} />
							{/each}
						</Select.Content>
					</Select.Root>
				</Field.Field>
				<Field.Field>
					<Label for="detail-year">Año</Label>
					<Select.Root bind:value={selectedYear} type="single" items={yearOptions}>
						<Select.Trigger id="detail-year" class="w-full">
							<Select.Value placeholder="Selecciona un año" />
						</Select.Trigger>
						<Select.Content>
							{#each yearOptions as year (year.value)}
								<Select.Item value={year.value} label={year.label} />
							{/each}
						</Select.Content>
					</Select.Root>
				</Field.Field>
			</div>
			{#if periodError}
				<p class="mt-4 text-sm text-destructive" role="alert">{periodError}</p>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if loading}
		<Card.Root>
			<Card.Content class="flex items-center justify-center gap-2 py-12 text-muted-foreground" role="status">
				<RotateCw class="size-4 animate-spin" />
				Consultando asistencia...
			</Card.Content>
		</Card.Root>
	{:else if employee}
		<Card.Root>
			<Card.Header>
				<Card.Title>Información del funcionario</Card.Title>
			</Card.Header>
			<Card.Content>
				<dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div>
						<dt class="text-sm text-muted-foreground">Cédula</dt>
						<dd class="font-medium">{employee.cedula}</dd>
					</div>
					<div>
						<dt class="text-sm text-muted-foreground">Nombre y apellido</dt>
						<dd class="font-medium">{employee.nombres} {employee.apellidos}</dd>
					</div>
					<div>
						<dt class="text-sm text-muted-foreground">Dependencia</dt>
						<dd class="font-medium">{employee.dependencia?.nombre ?? '—'}</dd>
					</div>
					<div>
						<dt class="text-sm text-muted-foreground">Período</dt>
						<dd class="font-medium">{selectedMonthLabel} {selectedYear}</dd>
					</div>
				</dl>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Calendario de asistencia</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-5">
				<div class="flex flex-wrap text-sm" style="column-gap: 2rem; row-gap: 1rem">
					{#each Object.entries(statusLabels) as [status, label] (status)}
						<div class="flex items-center gap-3">
							<span
								aria-hidden="true"
								class="inline-block size-4 rounded-full"
								style:border-radius="50%"
								style:background-color={statusColors[status as keyof typeof statusColors]}
							></span>
							<span>{label}</span>
						</div>
					{/each}
				</div>

				{#if calendarWeeks.length === 0}
					<p class="py-8 text-center text-muted-foreground">
						No hay semanas registradas para {selectedMonthLabel} {selectedYear}.
					</p>
				{:else}
					<div class="overflow-x-auto">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Semana</Table.Head>
									{#each weekdays as weekday (weekday)}
										<Table.Head class="text-center">{weekday}</Table.Head>
									{/each}
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each calendarWeeks as week, weekIndex (weekIndex)}
									<Table.Row>
										<Table.Cell class="font-medium">Semana {weekIndex + 1}</Table.Cell>
										{#each week as entry, dayIndex (dayIndex)}
											<Table.Cell class="text-center">
												{#if entry}
													{@const { day, status } = entry}
													<div
														title={`${day} de ${selectedMonthLabel}: ${getStatusLabel(status)}`}
														aria-label={`${day} de ${selectedMonthLabel}: ${getStatusLabel(status)}`}
														class={`mx-auto flex size-12 flex-col items-center justify-center rounded-full border border-transparent text-xs font-semibold leading-tight ${status ? 'text-white' : 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200'}`}
														style:border-radius="50%"
														style:background-color={status ? statusColors[status] : 'transparent'}
														style:color={status ? '#fff' : undefined}
													>
														{getDateDay(day)}
														<span class="text-[10px]">{status ?? '—'}</span>
													</div>
												{/if}
											</Table.Cell>
										{/each}
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{:else if !periodError}
		<Card.Root>
			<Card.Content class="py-12 text-center text-muted-foreground">
				No se encontró información de asistencia para este funcionario en {selectedMonthLabel} {selectedYear}.
			</Card.Content>
		</Card.Root>
	{/if}
</main>
