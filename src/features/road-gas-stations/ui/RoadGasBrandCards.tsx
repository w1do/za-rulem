import type { StationData } from '../../../lib/gasStations';
import { countRoadBrandStations, type RoadGasBrandCard } from '../model/brands';

interface Props {
	brands: RoadGasBrandCard[];
	stations: StationData[];
	isDataLoaded: boolean;
	selectedBrand: string | null;
	onSelect: (brand: RoadGasBrandCard | null) => void;
}

/** Индексируемые карточки сетей; live-feed дополняет их счётчиком и фильтром. */
const RoadGasBrandCards = ({
	brands,
	stations,
	isDataLoaded,
	selectedBrand,
	onSelect,
}: Props) => (
	<div className="road-gas-brands" aria-label="Фильтр АЗС по сети">
		<article className={`road-gas-brand-card ${selectedBrand === null ? 'is-active' : ''}`}>
			<div>
				<span className="road-gas-brand-card__eyebrow">Все заправки</span>
				<h3>АЗС вдоль трассы</h3>
				<p>Сбросьте фильтр бренда и верните на карту все найденные станции.</p>
			</div>
			<button
				type="button"
				className="road-gas-brand-card__filter"
				aria-pressed={selectedBrand === null}
				onClick={() => onSelect(null)}
			>
				Показать все
			</button>
		</article>

		{brands.map((brand) => {
			const count = countRoadBrandStations(stations, brand.aliases);
			const isActive = selectedBrand === brand.name;
			return (
				<article key={brand.name} className={`road-gas-brand-card ${isActive ? 'is-active' : ''}`}>
					<div>
						<span className="road-gas-brand-card__eyebrow">
							{isDataLoaded ? `${count} АЗС` : 'Сеть АЗС'}
						</span>
						<h3>{brand.name}</h3>
						<p>{brand.summary}</p>
					</div>

					<div className="road-gas-brand-card__actions">
						<button
							type="button"
							className="road-gas-brand-card__filter"
							aria-pressed={isActive}
							disabled={isDataLoaded && count === 0}
							onClick={() => onSelect(isActive ? null : brand)}
						>
							{isActive ? 'Сбросить фильтр' : 'Показать на карте'}
						</button>
						<details>
							<summary>Подробнее</summary>
							<p>{brand.description}</p>
						</details>
					</div>
				</article>
			);
		})}
	</div>
);

export default RoadGasBrandCards;
