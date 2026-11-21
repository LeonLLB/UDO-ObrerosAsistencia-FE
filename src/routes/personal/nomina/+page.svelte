<script lang="ts">
	import { onDestroy } from 'svelte';
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
	import { downloadReport } from '#lib/helpers/client/downloadReport.ts';
	import { FileSpreadsheetIcon, FileTextIcon, HandCoins, RefreshCw, Trash2 } from '@lucide/svelte/icons';
	import { toast } from 'svelte-sonner';
	import type { PageProps } from './$types';

	type PersonnelType = 'A' | 'O';
	type OnapreRecord = {
		id: number;
		tipoPersonal: PersonnelType;
		rango: number;
		claseFuncionario: string;
		salarioBase: string;
	};
	type PayrollRow = {
		id: number;
		cedula: string;
		nombres: string;
		apellidos: string;
		tipo: PersonnelType;
		dependencia: { id: number; nombre: string };
		onapre: OnapreRecord | null;
		cantidadAsignaciones: number;
		montoAsignaciones: number;
		cantidadDeducciones: number;
		montoDeducciones: number;
		neto: number;
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
		{ value: '11', label: 'Noviembre' },
		{ value: '12', label: 'Diciembre' }
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
	const typeOptions = [
		{ value: 'all', label: 'Todos' },
		{ value: 'A', label: 'Administrativo' },
		{ value: 'O', label: 'Obrero' }
	];

	let { data }: PageProps = $props();
	const departmentOptions = $derived([
		{ value: 'all', label: 'Todas las dependencias' },
		...data.departments.map((department) => ({
			value: String(department.id),
			label: department.nombre
		}))
	]);
	let selectedMonth = $state(String(currentMonth));
	let selectedYear = $state(String(currentYear));
	let selectedType = $state('all');
	let selectedDepartment = $state('all');
	let rows = $state<PayrollRow[]>([]);
	let loading = $state(false);
	let requestVersion = 0;
	let selectedEmployee = $state<PayrollRow | null>(null);
	let selectedOnapreId = $state('');
	let assignDialogOpen = $state(false);
	let preloadDialogOpen = $state(false);
	let clearDialogOpen = $state(false);
	let cestaTicketAmount = $state('');
	let assigning = $state(false);
	let preloading = $state(false);
	let clearing = $state(false);
	let downloading = $state<string | null>(null);
	let exportDialogOpen = $state(false);
	let selectedQuincena = $state('1');

	const applicableOnapre = $derived(
		selectedEmployee
			? data.onapre.filter((record) => record.tipoPersonal === selectedEmployee?.tipo)
			: []
	);
	const canModifyPeriod = $derived(
		Number(selectedMonth) === currentMonth && Number(selectedYear) === currentYear
	);
	const formatMoney = (amount: number | string | null | undefined) => {
		const value = Number(amount ?? 0);
		return Number.isFinite(value)
			? `Bs. ${new Intl.NumberFormat('es-VE', {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2
				}).format(value)}`
			: '—';
	};
	const onapreLabel = (record: OnapreRecord | null) => {
		if (!record) return 'Sin asignar';
		const range = record.tipoPersonal === 'A'
			? ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][record.rango - 1] ?? record.rango
			: record.rango;
		const workerClassLabels: Record<string, string> = {
			NC: 'NC — No clasificado',
			C: 'C — Clasificado',
			S: 'S — Supervisor'
		};
		const classLabel = workerClassLabels[record.claseFuncionario] ?? record.claseFuncionario;
		return `${range} · ${classLabel}`;
	};

	$effect(() => {
		const month = Number(selectedMonth);
		const year = Number(selectedYear);
		const requestId = ++requestVersion;
		const params = new URLSearchParams({ mes: String(month), anio: String(year) });
		if (selectedType !== 'all') params.set('tipo', selectedType);
		if (selectedDepartment !== 'all') params.set('idArea', selectedDepartment);

		rows = [];
		loading = true;
		void axiosA
			.get(`/nomina/resumen?${params.toString()}`)
			.then((response) => {
				if (requestId !== requestVersion) return;
				if (!Array.isArray(response.data)) {
					throw new Error('La respuesta del resumen de nómina tiene un formato inesperado.');
				}
				rows = response.data as PayrollRow[];
			})
			.catch((error: unknown) => {
				if (requestId !== requestVersion) return;
				rows = [];
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

	function openAssignDialog(employee: PayrollRow) {
		selectedEmployee = employee;
		selectedOnapreId = employee.onapre ? String(employee.onapre.id) : '';
		assignDialogOpen = true;
	}

	async function assignOnapre() {
		if (!selectedEmployee || !selectedOnapreId) {
			toast.error('Selecciona un rango ONAPRE.');
			return;
		}
		const onapre = applicableOnapre.find((record) => record.id === Number(selectedOnapreId));
		if (!onapre) {
			toast.error('El rango ONAPRE seleccionado no es válido para este tipo de personal.');
			return;
		}
		assigning = true;
		try {
			await axiosA.put(`/nomina/personal/${selectedEmployee.id}/onapre`, {
				idOnapre: onapre.id
			});
			rows = rows.map((row) => row.id === selectedEmployee?.id ? { ...row, onapre } : row);
			toast.success('Rango ONAPRE asignado.');
			assignDialogOpen = false;
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			assigning = false;
		}
	}

	async function preloadPayroll() {
		const amount = Number(cestaTicketAmount);
		if (!Number.isFinite(amount) || amount < 0 || !/^\d+(\.\d{1,2})?$/.test(cestaTicketAmount)) {
			toast.error('Indica un monto de cestaticket válido, con máximo dos decimales.');
			return;
		}
		preloading = true;
		try {
			await axiosA.post('/nomina/generar', {
				mes: Number(selectedMonth),
				anio: Number(selectedYear)
			});
			try {
				await axiosA.put('/nomina/cestaticket', {
					mes: Number(selectedMonth),
					anio: Number(selectedYear),
					monto: amount
				});
			} catch (error) {
				let refreshErrorMessage = '';
				try {
					await refreshRows();
				} catch (refreshError) {
					refreshErrorMessage = ` No se pudo actualizar el resumen: ${getApiErrorMessage(refreshError)}`;
				}
				toast.error(
					`La nómina se precargó, pero no se pudo aplicar la cestaticket: ${getApiErrorMessage(error)}.${refreshErrorMessage}`
				);
				return;
			}
			preloadDialogOpen = false;
			cestaTicketAmount = '';
			try {
				await refreshRows();
			} catch (error) {
				toast.error(
					`La nómina y la cestaticket se procesaron, pero no se pudo actualizar el resumen: ${getApiErrorMessage(error)}`
				);
				return;
			}
			toast.success('Nómina precargada y cestaticket aplicada al personal activo.');
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			preloading = false;
		}
	}

	async function clearPayroll() {
		clearing = true;
		try {
			await axiosA.post('/nomina/limpiar', {
				mes: Number(selectedMonth),
				anio: Number(selectedYear)
			});
			clearDialogOpen = false;
			try {
				await refreshRows();
			} catch (error) {
				toast.error(
					`La nómina se limpió, pero no se pudo actualizar el resumen: ${getApiErrorMessage(error)}`
				);
				return;
			}
			toast.success('Nómina del período limpiada.');
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			clearing = false;
		}
	}

	async function refreshRows() {
		const requestId = ++requestVersion;
		loading = true;
		const params = new URLSearchParams({
			mes: selectedMonth,
			anio: selectedYear
		});
		if (selectedType !== 'all') params.set('tipo', selectedType);
		if (selectedDepartment !== 'all') params.set('idArea', selectedDepartment);
		try {
			const response = await axiosA.get(`/nomina/resumen?${params.toString()}`);
			if (!Array.isArray(response.data)) {
				throw new Error('La respuesta del resumen de nómina tiene un formato inesperado.');
			}
			if (requestId === requestVersion) rows = response.data as PayrollRow[];
		} finally {
			if (requestId === requestVersion) loading = false;
		}
	}

	function openPayrollDetail(row: PayrollRow) {
		void goto(`/personal/nomina/${encodeURIComponent(row.cedula)}/${selectedYear}/${selectedMonth}`);
	}

	async function downloadPayrollReport(kind: 'txt' | 'resumen' | 'expediente' | 'personal', id?: number) {
		if (kind === 'txt') {
			const now = new Date();
			const year = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Caracas', year: 'numeric' }).format(now);
			const month = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Caracas', month: 'numeric' }).format(now);
			if (selectedYear !== year || selectedMonth !== month) {
				toast.error('El archivo bancario solo se genera para el mes actual.');
				return;
			}
		}
		if (kind === 'personal' && id === undefined) {
			toast.error('No se indicó el trabajador para el reporte.');
			return;
		}
		const params = new URLSearchParams({ mes: selectedMonth, anio: selectedYear });
		let path: string;
		let fileName: string;
		if (kind === 'txt') {
			params.set('quincena', selectedQuincena);
			path = '/nomina/exportar/txt';
			fileName = `nomina-${selectedYear}-${selectedMonth}-q${selectedQuincena}.txt`;
		} else if (kind === 'personal') {
			path = `/nomina/reportes/personal/${id}`;
			fileName = `nomina-${id}-${selectedYear}-${selectedMonth}.pdf`;
		} else {
			path = `/nomina/reportes/${kind}`;
			fileName = `${kind}-${selectedYear}-${selectedMonth}.pdf`;
		}
		downloading = kind === 'personal' ? `personal-${id}` : kind;
		try {
			await downloadReport(`${path}?${params}`, fileName);
			if (kind === 'txt') exportDialogOpen = false;
		} catch (error) {
			toast.error(getApiErrorMessage(error));
		} finally {
			downloading = null;
		}
	}
</script>

<main class="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-screen-2xl flex-col gap-6 px-4 py-8">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold">Nómina</h1>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button onclick={() => (preloadDialogOpen = true)} disabled={!canModifyPeriod || preloading || clearing}>
				{#if preloading}<Spinner class="size-4" />{:else}<RefreshCw class="size-4" />{/if}
				Precargar nómina
			</Button>
			<Button variant="outline" onclick={() => (exportDialogOpen = true)} disabled={!canModifyPeriod || downloading !== null}>
				<FileTextIcon class="size-4" /> Exportar TXT
			</Button>
			<Button variant="outline" onclick={() => downloadPayrollReport('resumen')} disabled={downloading !== null}>
				{#if downloading === 'resumen'}<Spinner class="size-4" />{:else}<FileTextIcon class="size-4" />{/if} Resumen PDF
			</Button>
			<Button variant="outline" onclick={() => downloadPayrollReport('expediente')} disabled={downloading !== null}>
				{#if downloading === 'expediente'}<Spinner class="size-4" />{:else}<FileTextIcon class="size-4" />{/if} Expediente PDF
			</Button>
			<Button variant="destructive" onclick={() => (clearDialogOpen = true)} disabled={!canModifyPeriod || clearing || preloading}>
				{#if clearing}<Spinner class="size-4" />{:else}<Trash2 class="size-4" />{/if}
				Limpiar nómina
			</Button>
		</div>
	</div>

	{#if !canModifyPeriod}
		<p class="text-sm text-muted-foreground">
			La precarga, limpieza y exportación TXT solo están habilitadas para el período actual.
		</p>
	{/if}
	

	<Card.Root>
		<Card.Header>
			<Card.Title>Filtros del período</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Field.Field>
					<Label for="payroll-month">Mes</Label>
					<Select.Root bind:value={selectedMonth} type="single" items={months}>
						<Select.Trigger id="payroll-month" class="w-full"><Select.Value placeholder="Mes" /></Select.Trigger>
						<Select.Content>{#each months as month (month.value)}<Select.Item value={month.value} label={month.label} />{/each}</Select.Content>
					</Select.Root>
				</Field.Field>
				<Field.Field>
					<Label for="payroll-year">Año</Label>
					<Select.Root bind:value={selectedYear} type="single" items={yearOptions}>
						<Select.Trigger id="payroll-year" class="w-full"><Select.Value placeholder="Año" /></Select.Trigger>
						<Select.Content>{#each years as year (year)}<Select.Item value={String(year)} label={String(year)} />{/each}</Select.Content>
					</Select.Root>
				</Field.Field>
				<Field.Field>
					<Label for="payroll-type">Tipo de funcionario</Label>
					<Select.Root bind:value={selectedType} type="single" items={typeOptions}>
						<Select.Trigger id="payroll-type" class="w-full"><Select.Value placeholder="Tipo" /></Select.Trigger>
						<Select.Content>{#each typeOptions as option (option.value)}<Select.Item value={option.value} label={option.label} />{/each}</Select.Content>
					</Select.Root>
				</Field.Field>
				<Field.Field>
					<Label for="payroll-department">Dependencia</Label>
					<Select.Root bind:value={selectedDepartment} type="single" items={departmentOptions}>
						<Select.Trigger id="payroll-department" class="w-full"><Select.Value placeholder="Dependencia" /></Select.Trigger>
						<Select.Content>{#each departmentOptions as option (option.value)}<Select.Item value={option.value} label={option.label} />{/each}</Select.Content>
					</Select.Root>
				</Field.Field>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Content class="p-0">
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Personal</Table.Head>
							<Table.Head>Dependencia</Table.Head>
							<Table.Head>Tipo</Table.Head>
							<Table.Head>ONAPRE (rango / cargo)</Table.Head>
							<Table.Head class="text-right text-blue-600">Asignaciones</Table.Head>
							<Table.Head class="text-right text-blue-600">Monto asignado</Table.Head>
							<Table.Head class="text-right text-red-600">Deducciones</Table.Head>
							<Table.Head class="text-right text-red-600">Monto deducido</Table.Head>
							<Table.Head class="text-right">Neto a pagar</Table.Head>
							<Table.Head class="text-right">Reporte</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if loading}
							<Table.Row><Table.Cell colspan={10} class="py-10 text-center"><Spinner class="mx-auto size-5" /></Table.Cell></Table.Row>
						{:else if rows.length === 0}
							<Table.Row><Table.Cell colspan={10} class="py-10 text-center text-muted-foreground">No hay personal activo para los filtros seleccionados.</Table.Cell></Table.Row>
						{:else}
							{#each rows as row (row.id)}
								<Table.Row>
									<Table.Cell>
										<button class="text-left font-medium text-primary underline-offset-4 hover:underline" onclick={() => openPayrollDetail(row)}>
											{row.cedula}<br />{row.nombres} {row.apellidos}
										</button>
									</Table.Cell>
									<Table.Cell>{row.dependencia.nombre}</Table.Cell>
									<Table.Cell>{row.tipo === 'A' ? 'Administrativo' : 'Obrero'}</Table.Cell>
									<Table.Cell>
										<div class="flex items-center gap-2">
											<span>{onapreLabel(row.onapre)}</span>
											<Button variant="outline" size="icon" aria-label="Cambiar ONAPRE" onclick={() => openAssignDialog(row)}>
												<HandCoins class="size-4" />
											</Button>
										</div>
									</Table.Cell>
									<Table.Cell class="text-right text-blue-600">{row.cantidadAsignaciones}</Table.Cell>
									<Table.Cell class="text-right font-medium text-blue-600">{formatMoney(row.montoAsignaciones)}</Table.Cell>
									<Table.Cell class="text-right text-red-600">{row.cantidadDeducciones}</Table.Cell>
									<Table.Cell class="text-right font-medium text-red-600">{formatMoney(row.montoDeducciones)}</Table.Cell>
									<Table.Cell class="text-right font-semibold">{formatMoney(row.neto)}</Table.Cell>
									<Table.Cell class="text-right">
										<Button variant="outline" size="icon" aria-label={`Descargar nómina de ${row.nombres} ${row.apellidos}`} title="Descargar nómina individual PDF" disabled={downloading !== null} onclick={() => downloadPayrollReport('personal', row.id)}>
											{#if downloading === `personal-${row.id}`}<Spinner class="size-4" />{:else}<FileSpreadsheetIcon class="size-4" />{/if}
										</Button>
									</Table.Cell>
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</main>

<Dialog.Root bind:open={exportDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Exportar archivo bancario TXT</Dialog.Title>
			<Dialog.Description>Selecciona la quincena del período actual. El archivo incluye todo el personal activo con conceptos en esa quincena.</Dialog.Description>
		</Dialog.Header>
		<Field.Field>
			<Label for="payroll-export-quincena">Quincena</Label>
			<Select.Root bind:value={selectedQuincena} type="single" items={[{ value: '1', label: 'Primera quincena' }, { value: '2', label: 'Segunda quincena' }]}>
				<Select.Trigger id="payroll-export-quincena" class="w-full"><Select.Value placeholder="Selecciona una quincena" /></Select.Trigger>
				<Select.Content>
					<Select.Item value="1" label="Primera quincena" />
					<Select.Item value="2" label="Segunda quincena" />
				</Select.Content>
			</Select.Root>
		</Field.Field>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (exportDialogOpen = false)} disabled={downloading !== null}>Cancelar</Button>
			<Button onclick={() => downloadPayrollReport('txt')} disabled={!canModifyPeriod || downloading !== null}>
				{#if downloading === 'txt'}<Spinner class="size-4" />{/if} Descargar TXT
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={assignDialogOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Cambiar ONAPRE asignado</Dialog.Title>
			<Dialog.Description>
				{#if selectedEmployee}{selectedEmployee.nombres} {selectedEmployee.apellidos} · {selectedEmployee.cedula}{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Field.Field>
			<Label for="payroll-onapre">Rango y cargo</Label>
			<Select.Root bind:value={selectedOnapreId} type="single" items={applicableOnapre.map((record) => ({
				value: String(record.id),
				label: `${onapreLabel(record)} — ${formatMoney(record.salarioBase)}`
			}))}>
				<Select.Trigger id="payroll-onapre" class="w-full"><Select.Value placeholder="Selecciona ONAPRE" /></Select.Trigger>
				<Select.Content>
					{#each applicableOnapre as record (record.id)}
						<Select.Item value={String(record.id)} label={`${onapreLabel(record)} — ${formatMoney(record.salarioBase)}`} />
					{/each}
				</Select.Content>
			</Select.Root>
		</Field.Field>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (assignDialogOpen = false)} disabled={assigning}>Cancelar</Button>
			<Button onclick={assignOnapre} disabled={assigning || !selectedOnapreId}>
				{#if assigning}<Spinner class="size-4" />{/if}Guardar
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={preloadDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Precargar nómina</Dialog.Title>
			<Dialog.Description>
				Se generarán los conceptos calculados para el personal activo y se aplicará la cestaticket a todos.
			</Dialog.Description>
		</Dialog.Header>
		<Field.Field>
			<Label for="cestaticket-amount">Monto de cestaticket (Bs.)</Label>
			<Input id="cestaticket-amount" type="number" min="0" step="0.01" bind:value={cestaTicketAmount} required disabled={preloading} />
		</Field.Field>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (preloadDialogOpen = false)} disabled={preloading}>Cancelar</Button>
			<Button onclick={preloadPayroll} disabled={preloading}>
				{#if preloading}<Spinner class="size-4" />{/if}Precargar
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={clearDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Limpiar nómina</Dialog.Title>
			<Dialog.Description>
				Se eliminarán los registros de nómina de todo el personal activo para el período seleccionado. Esta acción no se puede deshacer.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (clearDialogOpen = false)} disabled={clearing}>Cancelar</Button>
			<Button variant="destructive" onclick={clearPayroll} disabled={clearing}>
				{#if clearing}<Spinner class="size-4" />{/if}Limpiar nómina
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
