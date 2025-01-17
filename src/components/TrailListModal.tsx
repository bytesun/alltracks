import { useState, useEffect } from 'react';
import '../styles/TrailListModal.css'
import { Trail } from '../types/Trail';
import { useGlobalContext, useAlltracks } from './Store';
import { parseTrails } from '../utils/trailUtils';
interface TrailListModalProps {
    onSelect: (trail: Trail) => void;
    onClose: () => void;
}

export const TrailListModal: React.FC<TrailListModalProps> = ({ onSelect, onClose }) => {
    const { state:{
        isAuthed, principal
      }} = useGlobalContext();
      const alltracks = useAlltracks();
    const [trails, setTrails] = useState<Trail[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredTrails, setFilteredTrails] = useState<Trail[]>([]);
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

    useEffect(() => {
        loadTrails();
    }, [searchTerm]);

    useEffect(() => {
        const filtered = trails.filter(trail => {
            const matchesSearch = trail.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                trail.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDifficulty = selectedDifficulty === 'all' || trail.difficulty === selectedDifficulty;
            return matchesSearch && matchesDifficulty;
        });
        setFilteredTrails(filtered);
    }, [trails, selectedDifficulty]);


    const loadTrails = async () => {    
        try {
            const result = await alltracks.searchTrails(searchTerm);
            const parsedTrails = parseTrails(result);
            
            setTrails(parsedTrails);
            setLoading(false);
        } catch (error) {
            console.error('Error loading trails:', error);
            setLoading(false);
        }
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
                            <option value="expert">Expert</option>
                        </select>
                    </div>
                </div>
                <div className="modal-body">
                    {loading ? (
                        <div className="loading-container">
                            <span className="material-icons spinning">refresh</span>
                            <span>Loading trails...</span>
                        </div>
                    ) : (
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
                                            <span>{trail.distance} km</span>
                                            <span>{trail.difficulty} </span>
                                        </div>
                                    </div>
                                    <span className="material-icons">chevron_right</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

