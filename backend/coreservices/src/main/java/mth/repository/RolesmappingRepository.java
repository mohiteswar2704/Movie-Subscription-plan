package mth.repository;

import org.springframework.data.jpa.repository.JpaRepository;


import mth.models.Rolesmapping;
import mth.models.RolesmappingId;


public interface RolesmappingRepository extends JpaRepository<Rolesmapping, RolesmappingId> {
}
