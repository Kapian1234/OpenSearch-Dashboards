/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { EuiSpacer, EuiFlexItem, EuiSmallButton, EuiFlexGroup, EuiPanel } from '@elastic/eui';
import { i18n } from '@osd/i18n';
import { SavedObjectsStart, CoreStart } from '../../../../../core/public';
import { DataSource, DataSourceConnection, DataSourceConnectionType } from '../../../common/types';
import { WorkspaceFormError } from './types';
import { AssociationDataSourceModal } from '../workspace_detail/association_data_source_modal';
import { useOpenSearchDashboards } from '../../../../opensearch_dashboards_react/public';
import { WorkspaceClient } from '../../workspace_client';
import { AssociationDataSourceModalMode } from '../../../common/constants';
import { DataSourceConnectionTable } from '../workspace_detail/data_source_connection_table';
import { fetchDataSourceConnections } from '../../utils';
import { DataSourceEngineType } from '../../../../data_source/common/data_sources';

export interface SelectDataSourcePanelProps {
  errors?: { [key: number]: WorkspaceFormError };
  savedObjects: SavedObjectsStart;
  assignedDataSources: DataSource[];
  onChange: (value: DataSource[]) => void;
  isDashboardAdmin: boolean;
}

export const SelectDataSourcePanel = ({
  errors,
  onChange,
  assignedDataSources,
  savedObjects,
  isDashboardAdmin,
}: SelectDataSourcePanelProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState<DataSourceConnection[]>([]);
  const [assignedDataSourceConnections, setAssignedDataSourceConnections] = useState<
    DataSourceConnection[]
  >([]);
  const [toggleIdSelected, setToggleIdSelected] = useState(
    AssociationDataSourceModalMode.OpenSearchConnections
  );
  const {
    services: { notifications, http, chrome },
  } = useOpenSearchDashboards<{ CoreStart: CoreStart; workspaceClient: WorkspaceClient }>();

  useEffect(() => {
    fetchDataSourceConnections(assignedDataSources, http, notifications).then((connections) => {
      setAssignedDataSourceConnections(connections);
    });
  }, [assignedDataSources, http, notifications]);

  const handleAssignDataSources = (dataSourceConnections: DataSourceConnection[]) => {
    setModalVisible(false);
    const dataSources = dataSourceConnections
      .filter(
        ({ connectionType }) => connectionType === DataSourceConnectionType.OpenSearchConnection
      )
      .map(({ id, type, name, description }) => ({
        id,
        title: name,
        description,
        dataSourceEngineType: type as DataSourceEngineType,
      }));
    const savedDataSources: DataSource[] = [...assignedDataSources, ...dataSources];
    onChange(savedDataSources);
  };

  const handleUnassignDataSources = (dataSourceConnections: DataSourceConnection[]) => {
    const savedDataSources = (assignedDataSources ?? [])?.filter(
      ({ id }: DataSource) => !dataSourceConnections.some((item) => item.id === id)
    );
    onChange(savedDataSources);
  };

  const renderTableContent = () => {
    return (
      <EuiPanel paddingSize="none" hasBorder={false}>
        <DataSourceConnectionTable
          isDashboardAdmin={isDashboardAdmin}
          dataSourceConnections={assignedDataSourceConnections}
          handleUnassignDataSources={handleUnassignDataSources}
          onSelectedItems={getSelectedItems}
          inCreatePage={true}
          connectionType={AssociationDataSourceModalMode.OpenSearchConnections}
        />
      </EuiPanel>
    );
  };

  const addOpenSearchConnectionsButton = (
    <EuiSmallButton
      iconType="plusInCircle"
      onClick={() => {
        setToggleIdSelected(AssociationDataSourceModalMode.OpenSearchConnections);
        setModalVisible(true);
      }}
      data-test-subj="workspace-creator-dataSources-assign-button"
    >
      {i18n.translate('workspace.form.selectDataSourcePanel.addNew', {
        defaultMessage: 'Add data sources',
      })}
    </EuiSmallButton>
  );

  const addDirectQueryConnectionsButton = (
    <EuiSmallButton
      iconType="plusInCircle"
      onClick={() => {
        setToggleIdSelected(AssociationDataSourceModalMode.DirectQueryConnections);
        setModalVisible(true);
      }}
      data-test-subj="workspace-creator-dqc-assign-button"
    >
      {i18n.translate('workspace.form.selectDataSourcePanel.addNewDQCs', {
        defaultMessage: 'Add direct query connections',
      })}
    </EuiSmallButton>
  );

  const removeButton = (
    <EuiSmallButton
      iconType="unlink"
      color="danger"
      onClick={() => {
        handleUnassignDataSources(selectedItems);
      }}
      data-test-subj="workspace-creator-dataSources-remove-button"
    >
      {i18n.translate('workspace.form.selectDataSourcePanel.remove', {
        defaultMessage: 'Remove selected',
      })}
    </EuiSmallButton>
  );

  const getSelectedItems = useCallback(
    (currentSelectedItems: DataSourceConnection[]) => setSelectedItems(currentSelectedItems),
    [setSelectedItems]
  );

  return (
    <div>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        {isDashboardAdmin && selectedItems.length > 0 && assignedDataSources.length > 0 && (
          <EuiFlexItem grow={false}>{removeButton}</EuiFlexItem>
        )}
        {isDashboardAdmin && (
          <EuiFlexItem grow={false}>{addOpenSearchConnectionsButton}</EuiFlexItem>
        )}
        {isDashboardAdmin && (
          <EuiFlexItem grow={false}>{addDirectQueryConnectionsButton}</EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexItem style={{ maxWidth: 768 }}>
        {assignedDataSources.length > 0 && renderTableContent()}
      </EuiFlexItem>
      {modalVisible && chrome && (
        <AssociationDataSourceModal
          savedObjects={savedObjects}
          assignedConnections={assignedDataSourceConnections}
          closeModal={() => setModalVisible(false)}
          handleAssignDataSourceConnections={handleAssignDataSources}
          http={http}
          mode={toggleIdSelected as AssociationDataSourceModalMode}
          notifications={notifications}
          logos={chrome?.logos}
        />
      )}
    </div>
  );
};
