import { useState, useEffect } from 'react';
import '../styles/TrailListModal.css'

import { Trail } from '../types/Trail';
import { Doc, listDocs } from '@junobuild/core';
interface TrailListModalProps {
    onSelect: (trail: Trail) => void;
    onClose: () => void;
}

export const TrailListModal: React.FC<TrailListModalProps> = ({ onSelect, onClose }) => {
    const [trails, setTrails] = useState<Trail[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredTrails, setFilteredTrails] = useState<Trail[]>([]);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

    useEffect(() => {
        loadTrails();
    }, []);

    useEffect(() => {
        const filtered = trails.filter(trail => {
            const matchesSearch = trail.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                trail.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDifficulty = selectedDifficulty === 'all' || trail.difficulty === selectedDifficulty;
            return matchesSearch && matchesDifficulty;
        });
        setFilteredTrails(filtered);
    }, [searchTerm, trails, selectedDifficulty]);

    const loadTrails = async () => {
        const result = await listDocs<Trail>({
            collection: "trails",
            filter: {
                order: {
                    desc: true,
                    field: "updated_at"
                }
            }
        });

        const trailList = result.items.map(item => item.data as Trail);

        setTrails(trailList);
        setLoading(false);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="search-container">
                    <div className="search-input">
                        <span className="material-icons">search</span>
                        <input
                            type="text"
                            placeholder="Search trails..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-options">
                        <select 
                            value={selectedDifficulty}
                            onChange={(e) => setSelectedDifficulty(e.target.value)}
                            className="difficulty-select"
                        >
                            <option value="all">All Difficulties</option>
                            <option value="easy">Easy</option>
                            <option value="moderate">Moderate</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                </div>
                <div className="modal-body">
                    <div className="trail-list">
                        {filteredTrails.map(trail => (
                            <div
                                key={trail.id}
                                className="trail-item"
                                onClick={() => onSelect(trail)}
                            >
                                <div className="trail-info">
                                    <h3>{trail.name}</h3>
                                    <div className="trail-stats">
                                        <span>{trail.elevationGain} m</span>
                                        <span>{trail.length} km</span>
                                        <span>{trail.difficulty} </span>
                                    </div>
                                </div>
                                <span className="material-icons">chevron_right</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

