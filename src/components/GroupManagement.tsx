import React, { useState, useEffect } from 'react';
import { Doc, setDoc, listDocs } from '@junobuild/core';
import { GroupList } from './GroupList';
import { CreateGroupModal } from './CreateGroupModal';
import '../styles/Group.css';
import { User } from "@junobuild/core";
import { EditGroupModal } from './EditGroupModal';
import { Group } from '../types/Group';
import { useNotification } from '../context/NotificationContext';
import { useGlobalContext, useAlltracks } from './Store';
import { NewGroup } from '../api/alltracks/backend.did';

interface BeEditGroup extends Group {
  key: string;
  version: bigint;
}

export const GroupManagement = () => {
  const { state: { isAuthed , principal} } = useGlobalContext();
  const alltracks = useAlltracks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groups, setGroups] = useState<BeEditGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const groups = await alltracks.getMyGroups();
      
      // const { items } = await listDocs<Group>({
      //   collection: "groups",
      //   filter: {
      //     owner: user.key
      //   }
      // });

      // const formattedGroups = items.map(item => ({
      //   ...item.data,
      //   key: item.key,
      //   version: item.version
      // }));

      const formattedGroups = groups.map(item => ({
        name: item.name,
        description: item.description,
        calendarId: item.id,
        members: item.members,
        groupBadge: item.groupBadge,
      } as Group));
      setGroups(formattedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };
  const handleCreateGroup = async (groupData: Group) => {

    try {
      const result = await alltracks.createGroup({
        name: groupData.name,
        description: groupData.description,
        members: [principal],
        id: groupData.calendarId,
        admin: principal,
        badge: groupData.groupBadge,
        
      } as NewGroup);
      console.log("result", result)
      // await setDoc({
      //   collection: "groups",
      //   doc: {
      //     key: groupData.calendarId,
      //     data: {
      //       ...groupData,
      //       members: [user.key],
      //     }
      //   }
      // });
      if(result["ok"]){
        showNotification(`Group ${groupData.name} created successfully`, 'success');
        await fetchGroups();
        setIsModalOpen(false);
      }
      else{
        showNotification(`Error creating group ${result["err"]}`, 'error');
      }
     
    } catch (error) {
      showNotification(`Error creating group ${error} `, 'error');
    }


  };
  const handleUpdateGroup = async (updatedData: BeEditGroup) => {
    try {
      // Prepare payload matching the canister NewGroup type
      const payload = {
        id: updatedData.calendarId,
        name: updatedData.name,
        description: updatedData.description,
        badge: updatedData.groupBadge || '',
        // keep existing members if present, otherwise use current principal
        members: (updatedData.members && updatedData.members.length > 0) ? updatedData.members : [principal],
        admin: principal,
      } as any;

      const res = await alltracks.updateGroup(updatedData.calendarId, payload);
      if (res && (res as any).ok) {
        showNotification(`Group ${updatedData.name} updated`, 'success');
        await fetchGroups();
        setEditingGroup(null);
      } else {
        const err = (res as any).err || 'Unknown error';
        showNotification(`Failed to update group: ${err}`, 'error');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      showNotification(`Error updating group: ${String(error)}`, 'error');
    }
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

      <GroupList
        groups={groups}
        onEditGroup={(group) => setEditingGroup(group)}
      />

      <CreateGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateGroup}
      />


      {editingGroup && <EditGroupModal
        group={editingGroup}
        onClose={() => setEditingGroup(null)}
        onSubmit={handleUpdateGroup}
      />}

    </div>
  );
};