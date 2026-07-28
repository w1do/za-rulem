import {
	FUEL_FILTER_TYPES,
	FUEL_LIMIT_OPTIONS,
	getFuelName,
	type QueueFilter,
} from '../../lib/gasStations';

interface Props {
	searchQuery: string;
	fuelTypes: string[];
	fuelLimit: number | null;
	onlyCanister: boolean;
	queue: QueueFilter;
	onSearchQueryChange: (value: string) => void;
	onToggleFuelType: (fuelType: string) => void;
	onToggleFuelLimit: (limit: number) => void;
	onToggleCanister: () => void;
	onToggleQueue: (queue: Exclude<QueueFilter, 'ALL'>) => void;
}

/** Поиск и фильтры сайдбара: только представление, вся логика выбора живёт в GasMap. */
const StationFiltersPanel = ({
	searchQuery,
	fuelTypes,
	fuelLimit,
	onlyCanister,
	queue,
	onSearchQueryChange,
	onToggleFuelType,
	onToggleFuelLimit,
	onToggleCanister,
	onToggleQueue,
}: Props) => (
	<>
		<div className="sidebar-search">
			<input
				type="text"
				placeholder="Поиск АЗС..."
				value={searchQuery}
				onChange={(e) => onSearchQueryChange(e.target.value)}
				className="search-input"
			/>
		</div>

		<div className="sidebar-filters">
			<div className="filter-group">
				<div className="filter-label">Топливо:</div>
				<div className="filter-buttons">
					{FUEL_FILTER_TYPES.map((type) => (
						<button
							key={type}
							onClick={() => onToggleFuelType(type)}
							className={`filter-btn btn-sm ${fuelTypes.includes(type) ? 'active' : ''}`}
							aria-pressed={fuelTypes.includes(type)}
						>
							{getFuelName(type)}
						</button>
					))}
				</div>
			</div>

			<div className="filter-group">
				<div className="filter-label">Очередь:</div>
				<div className="filter-buttons">
					<button
						onClick={() => onToggleQueue('SMALL')}
						className={`filter-btn btn-sm ${queue === 'SMALL' ? 'active' : ''}`}
						data-tip="Маленькая очередь"
						aria-pressed={queue === 'SMALL'}
					>
						<i className="fas fa-bolt me-1"></i> Быстро
					</button>
					<button
						onClick={() => onToggleQueue('LARGE')}
						className={`filter-btn btn-sm ${queue === 'LARGE' ? 'active' : ''}`}
						data-tip="Большая очередь"
						aria-pressed={queue === 'LARGE'}
					>
						<i className="fas fa-users me-1"></i> Очередь
					</button>
				</div>
			</div>

			<div className="filter-group">
				<div className="filter-label">Лимит:</div>
				<div className="filter-buttons">
					{FUEL_LIMIT_OPTIONS.map((limit) => (
						<button
							key={limit}
							onClick={() => onToggleFuelLimit(limit)}
							className={`filter-btn btn-sm ${fuelLimit === limit ? 'active' : ''}`}
							aria-pressed={fuelLimit === limit}
						>
							{limit} л
						</button>
					))}
				</div>
			</div>

			<div className="filter-group">
				<div className="filter-buttons row g-2">
					<div className="col-6">
						<button
							onClick={onToggleCanister}
							className={`filter-btn btn-sm w-100 ${onlyCanister ? 'active' : ''}`}
							aria-pressed={onlyCanister}
						>
							<i className="fas fa-fill-drip me-1"></i> Канистра
						</button>
					</div>
				</div>
			</div>
		</div>
	</>
);

export default StationFiltersPanel;
