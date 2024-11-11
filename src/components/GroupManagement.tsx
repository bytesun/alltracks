import React, { useState, useEffect } from 'react';
import { setDoc, listDocs } from '@junobuild/core';
import { GroupList } from './GroupList';
import { CreateGroupModal } from './CreateGroupModal';
import '../styles/Group.css';
import { User } from "@junobuild/core";

interface GroupManagementProps {
    user: User;
}
interface GroupData {
    name: string;
    description: string;
    calendarId: string;
    createdBy: string;
    members: string[];
    createdAt: number;
    groupBadge: string; 
  }
export const GroupManagement = ({ user }: GroupManagementProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [groups, setGroups] = useState([]);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
          const { items } = await listDocs<GroupData>({
            collection: "groups",
            filter: {
              owner: user.key
            }
          });
          
          const formattedGroups = items.map(item => ({
            id: item.key,
            ...item.data,
            createdAt: new Date(item.data.createdAt).toLocaleDateString()
          }));
          
          setGroups(formattedGroups);
        } catch (error) {
          console.error('Error fetching groups:', error);
        }
      };
    const handleCreateGroup = async (groupData) => {
        await setDoc({
            collection: "groups",
            doc: {
                key: groupData.calendarId,
                data: {
                    ...groupData,
                    createdBy: user.key,
                    members: [user.key],
                    createdAt: Date.now()
                }
            }
        });

        await fetchGroups();
        setIsModalOpen(false);
    };

    return (
        <div className="groups-container">
            <div className="settings-header">
                <h2>My Groups</h2>
                <button
                    className="create-group-btn"
                    onClick={() => setIsModalOpen(true)}
                >
                    <span className="material-icons">add</span>
                    New Group
                </button>
            </div>

            <GroupList groups={groups} />

            <CreateGroupModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateGroup}
            />
        </div>
    );
};