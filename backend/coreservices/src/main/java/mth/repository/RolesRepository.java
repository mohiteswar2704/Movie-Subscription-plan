package mth.repository;

import org.springframework.data.jpa.repository.JpaRepository;


import mth.models.Roles;


public interface RolesRepository extends JpaRepository<Roles, Long> {
}