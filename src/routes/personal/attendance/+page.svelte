<script lang="ts">
	import { page } from '$app/state';
	import { onDestroy } from 'svelte';
	import { axiosA } from '#lib/adapters/Axios.adapter.ts';
	import Button from '#lib/components/ui/button/button.svelte';
	import * as Card from '#lib/components/ui/card/index.ts';
	import * as Field from '#lib/components/ui/field/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Select from '#lib/components/ui/select/index.ts';
	import * as Table from '#lib/components/ui/table/index.ts';
	import { getApiErrorMessage } from '#lib/helpers/client/getApiErrorMessage.ts';
	import { downloadReport } from '#lib/helpers/client/downloadReport.ts';
	import { Spinner } from '#lib/components/ui/spinner/index.ts';
	import { CalendarDays, ExternalLink, FileTextIcon, RotateCw } from '@lucide/svelte/icons';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';

	type WeeklyAttendance = {
		semana: number;
		fechaInicio: string | null;
		fechaFin: string | null;
		asistencias: number | string;
		inasistencias: number | string;
		permisos: number | string;
	};

	type MonthlyAttendance = {
		cedula: string;
		nombres: string;
		apellidos: string;
		dependencia: { nombre: string };
		tipo: 'A' | 'O';
		semanas: WeeklyAttendance[];
		promedioHorasTrabajadasDiarias: number | string;
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
	const workerTypes = [
		{ value: 'A', label: 'Administrativo' },
		{ value: 'O', label: 'Obrero' }
	];
	const workerTypeOptions = [
		{ value: 'all', label: 'Todos los tipos' },
		...workerTypes
	];

	let { data }: PageProps = $props();
	const departmentOptions = $derived([
		{ value: 'all', label: 'Todas las dependencias' },
		...data.departments.map((department) => ({
			value: String(department.id),
			label: department.nombre
		}))
	]);
	let selectedMonth = $state(String(Math.min(currentMonth, 11)));
	let selectedYear = $state(String(currentYear));
	let selectedDepartment = $state('all');
	let selectedType = $state('all');
	let attendance = $state<MonthlyAttendance[]>([]);
	let loading = $state(false);
	let downloadingReport = $state(false);
	let hasSearched = $state(false);
	let periodError = $state('');
	let requestVersion = 0;
	let lastNotifiedInvalidPeriod = '';

	const weeks = $derived(attendance[0]?.semanas ?? []);
	const weekCount = $derived(weeks.length);
	const formatMetric = (value: number | string | undefined) => {
		if (value === undefined || value === '') return '—';
		const numericValue = Number(value);
		return Number.isFinite(numericValue)
			? new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 }).format(numericValue)
			: '—';
	};
	const formatWeekRange = (week: WeeklyAttendance) => {
		const startDay = week.fechaInicio?.match(/^\d{4}-\d{2}-(\d{2})/)?.[1];
		const endDay = week.fechaFin?.match(/^\d{4}-\d{2}-(\d{2})/)?.[1];
		return startDay && endDay
			? `Semana ${week.semana} (${startDay} – ${endDay})`
			: `Semana ${week.semana}`;
	};
	$effect(() => {
		const month = page.url.searchParams.get('mes');
		const year = page.url.searchParams.get('anio');
		if (
			month &&
			year &&
			months.some((option) => option.value === month) &&
			years.includes(Number(year))
		) {
			selectedMonth = month;
			selectedYear = year;
		}
	});

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
			attendance = [];
			loading = false;
			hasSearched = false;
			periodError =
				year === currentYear && month > currentMonth
					? 'No se puede consultar un mes que aún no ha transcurrido.'
					: 'Selecciona un mes y un año válidos.';
			const periodKey = `${selectedYear}-${selectedMonth}`;
			if (lastNotifiedInvalidPeriod !== periodKey) {
				toast.error(periodError);
				lastNotifiedInvalidPeriod = periodKey;
			}
			return;
		}

		periodError = '';
		lastNotifiedInvalidPeriod = '';
		const params = new URLSearchParams({ mes: String(month), anio: String(year) });
		if (selectedDepartment !== 'all') params.set('idArea', selectedDepartment);
		if (selectedType !== 'all') params.set('tipo', selectedType);

		attendance = [];
		loading = true;
		hasSearched = true;
		void axiosA
			.get(`/asistencia/mensual?${params.toString()}`)
			.then((response) => {
				if (requestId !== requestVersion) return;
				if (!Array.isArray(response.data)) {
					throw new Error('La respuesta de asistencia mensual tiene un formato inesperado.');
				}
				attendance = response.data as MonthlyAttendance[];
			})
			.catch((error: unknown) => {
				if (requestId !== requestVersion) return;
				attendance = [];
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

	async function downloadAttendanceReport() {
		if (periodError || !hasSearched) {
			toast.error('Selecciona un período válido para descargar el reporte.');
			return;
		}
		const params = new URLSearchParams({ mes: selectedMonth, anio: selectedYear });
		if (selectedDepartment !== 'all') params.set('idArea', selectedDepartment);
		if (selectedType !== 'all') params.set('tipo', selectedType);
		downloadingReport = true;
		try {
			await downloadReport(
				`/asistencia/mensual/reporte?${params}`,
				`asistencia-${selectedYear}-${selectedMonth.padStart(2, '0')}.pdf`
			);
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			downloadingReport = false;
		}
	}
</script>


<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-screen-2xl flex-col gap-6 px-4 py-8">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">Asistencia mensual</h1>
		<Button variant="outline" onclick={downloadAttendanceReport} disabled={downloadingReport || !!periodError || !hasSearched}>
			{#if downloadingReport}<Spinner class="size-4" />{:else}<FileTextIcon class="size-4" />{/if}
			Descargar reporte PDF
		</Button>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<CalendarDays class="size-5" />
				Filtros de consulta
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Field.Field>
					<Label for="attendance-month">Mes</Label>
					<Select.Root bind:value={selectedMonth} type="single" items={months}>
						<Select.Trigger id="attendance-month" class="w-full">
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
					<Label for="attendance-year">Año</Label>
					<Select.Root bind:value={selectedYear} type="single" items={yearOptions}>
						<Select.Trigger id="attendance-year" class="w-full">
							<Select.Value placeholder="Selecciona un año" />
						</Select.Trigger>
						<Select.Content>
							{#each years as year (year)}
								<Select.Item value={String(year)} label={String(year)} />
							{/each}
						</Select.Content>
					</Select.Root>
				</Field.Field>

				<Field.Field>
					<Label for="attendance-department">Dependencia</Label>
					<Select.Root bind:value={selectedDepartment} type="single" items={departmentOptions}>
						<Select.Trigger id="attendance-department" class="w-full">
							<Select.Value placeholder="Todas las dependencias" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label="Todas las dependencias" />
							{#each data.departments as department (department.id)}
								<Select.Item value={String(department.id)} label={department.nombre} />
							{/each}
						</Select.Content>
					</Select.Root>
				</Field.Field>

				<Field.Field>
					<Label for="attendance-type">Tipo de trabajador</Label>
					<Select.Root bind:value={selectedType} type="single" items={workerTypeOptions}>
						<Select.Trigger id="attendance-type" class="w-full">
							<Select.Value placeholder="Todos los tipos" />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all" label="Todos los tipos" />
							{#each workerTypes as workerType (workerType.value)}
								<Select.Item value={workerType.value} label={workerType.label} />
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

	<Card.Root>
		<Card.Header>
			<Card.Title>Registro de asistencia</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if loading}
				<div class="flex items-center justify-center gap-2 py-12 text-muted-foreground" role="status">
					<RotateCw class="size-4 animate-spin" />
					Consultando asistencia...
				</div>
			{:else if attendance.length === 0}
				<p class="py-12 text-center text-muted-foreground">
					{hasSearched ? 'No hay registros para los filtros seleccionados.' : 'Selecciona un período válido para consultar.'}
				</p>
			{:else}
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head rowspan={2}>Cédula</Table.Head>
								<Table.Head rowspan={2}>Personal</Table.Head>
								<Table.Head rowspan={2}>Dependencia</Table.Head>
								<Table.Head rowspan={2}>Tipo</Table.Head>
								{#each weeks as week (week.semana ?? week.fechaInicio)}
									{#if week.fechaInicio && week.fechaFin}
										<Table.Head colspan={1} class="text-center">{formatWeekRange(week)}</Table.Head>
									{/if}
								{/each}
								<Table.Head rowspan={2} class="text-center">Prom. horas diarias (mes)</Table.Head>
							</Table.Row>
							<Table.Row>
								{#each weeks as week (week.semana ?? week.fechaInicio)}
									{#if week.fechaInicio && week.fechaFin}
										<Table.Head class="text-center">Asist. / Inasist. / Perm.</Table.Head>
									{/if}
								{/each}
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each attendance as employee (employee.cedula)}
								<Table.Row>
									<Table.Cell>
										<a
											class="font-medium text-primary underline-offset-4 hover:underline"
											href={`/personal/attendance/${encodeURIComponent(employee.cedula)}/${selectedMonth}/${selectedYear}`}
										>
											{employee.cedula}
										</a>
									</Table.Cell>
									<Table.Cell>
										<a
											class="font-medium text-primary underline-offset-4 hover:underline"
											href={`/personal/attendance/${encodeURIComponent(employee.cedula)}/${selectedMonth}/${selectedYear}`}
										>
											{employee.apellidos}, {employee.nombres}
											<ExternalLink class="ml-1 inline size-3" />
										</a>
									</Table.Cell>
									<Table.Cell>{employee.dependencia?.nombre ?? '—'}</Table.Cell>
									<Table.Cell>{employee.tipo === 'A' ? 'Administrativo' : 'Obrero'}</Table.Cell>
									{#each Array.from({ length: weekCount }, (_, index) => index) as index (index)}
										{@const week = employee.semanas[index]}
										{#if week.fechaInicio && week.fechaFin}
										<Table.Cell class="text-center">
												<span class="text-lg font-semibold" style="color: #15803d">{formatMetric(week.asistencias)} </span>
												<span class="text-lg font-semibold text-muted-foreground"> / </span>
												<span class="text-lg font-semibold" style="color: #b91c1c">{formatMetric(week.inasistencias)} </span>
												<span class="text-lg font-semibold text-muted-foreground"> / </span>
												<span class="text-lg font-semibold" style="color: #1d4ed8">{formatMetric(week.permisos)} </span>
											
											</Table.Cell>
										{/if}
									{/each}
									<Table.Cell class="text-center font-semibold text-lg">{formatMetric(employee.promedioHorasTrabajadasDiarias)}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</main>
